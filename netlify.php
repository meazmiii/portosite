<?php
declare(strict_types=1);

$secureCookie = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params([
    'httponly' => true,
    'secure' => $secureCookie,
    'samesite' => 'Lax',
    'path' => '/',
]);
ini_set('session.use_strict_mode', '1');
session_start();

header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

function jsonResponse(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function setting(string $name): string
{
    $value = getenv($name);
    return $value === false ? '' : trim($value);
}

function requireCsrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';
    if ($provided === '' || $expected === '' || !hash_equals($expected, $provided)) {
        jsonResponse(403, ['error' => 'Sesi keamanan tidak valid. Muat ulang halaman lalu coba lagi.']);
    }
}

function netlifyRequest(string $method, string $path, string $token, ?string $body = null, string $contentType = 'application/json'): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('Ekstensi PHP cURL belum aktif.');
    }

    $curl = curl_init('https://api.netlify.com/api/v1' . $path);
    $headers = [
        'Authorization: Bearer ' . $token,
        'Accept: application/json',
    ];
    if ($body !== null) {
        $headers[] = 'Content-Type: ' . $contentType;
    }

    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 60,
    ]);
    if ($body !== null) {
        curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
    }

    $responseBody = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);

    if ($responseBody === false) {
        throw new RuntimeException('Tidak dapat menghubungi Netlify: ' . $curlError);
    }

    $decoded = json_decode($responseBody, true);
    if ($status < 200 || $status >= 300) {
        $message = is_array($decoded)
            ? ($decoded['message'] ?? $decoded['error_description'] ?? $decoded['error'] ?? '')
            : '';
        throw new RuntimeException(
            'Netlify menolak permintaan (HTTP ' . $status . '). ' .
            ($message !== '' ? (string) $message : 'Periksa akun dan izin Netlify-mu.')
        );
    }

    return is_array($decoded) ? $decoded : [];
}

function createPortfolioSite(string $token, string $name): array
{
    $asciiName = function_exists('iconv')
        ? iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name)
        : false;
    if ($asciiName === false) {
        $asciiName = $name;
    }
    $slug = strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '-', $asciiName), '-'));
    $slug = substr($slug !== '' ? $slug : 'portofolio', 0, 44);
    $siteName = $slug . '-' . bin2hex(random_bytes(3));

    return netlifyRequest(
        'POST',
        '/sites',
        $token,
        json_encode(['name' => $siteName], JSON_UNESCAPED_SLASHES)
    );
}

function deployPortfolio(string $token, string $siteId, string $html): array
{
    if (!class_exists('ZipArchive')) {
        throw new RuntimeException('Ekstensi PHP Zip belum aktif. Aktifkan ZipArchive di konfigurasi PHP.');
    }

    $zipPath = tempnam(sys_get_temp_dir(), 'portosite-');
    if ($zipPath === false) {
        throw new RuntimeException('Server tidak dapat menyiapkan file website sementara.');
    }

    try {
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Server tidak dapat membuat paket website.');
        }
        $fileAdded = $zip->addFromString('index.html', $html);
        $archiveClosed = $zip->close();
        if (!$fileAdded || !$archiveClosed) {
            throw new RuntimeException('Server gagal menyiapkan file website.');
        }

        $archive = file_get_contents($zipPath);
        if ($archive === false) {
            throw new RuntimeException('Server gagal membaca paket website.');
        }

        return netlifyRequest(
            'POST',
            '/sites/' . rawurlencode($siteId) . '/deploys',
            $token,
            $archive,
            'application/zip'
        );
    } finally {
        if (is_file($zipPath)) {
            unlink($zipPath);
        }
    }
}

function waitForDeploy(string $token, string $deployId): bool
{
    if ($deployId === '') {
        throw new RuntimeException('Netlify tidak mengembalikan ID deployment.');
    }

    for ($attempt = 0; $attempt < 20; $attempt++) {
        $deploy = netlifyRequest('GET', '/deploys/' . rawurlencode($deployId), $token);
        $state = strtolower((string) ($deploy['state'] ?? ''));
        if ($state === 'ready') {
            return true;
        }
        if (in_array($state, ['error', 'failed'], true)) {
            throw new RuntimeException('Netlify gagal memproses deployment website.');
        }
        usleep(1_000_000);
    }

    return false;
}

$action = $_GET['action'] ?? '';
$clientId = setting('NETLIFY_CLIENT_ID');
$clientSecret = setting('NETLIFY_CLIENT_SECRET');
$redirectUri = setting('NETLIFY_REDIRECT_URI');
$configured = $clientId !== '' && $clientSecret !== '' && $redirectUri !== '';

if ($action === 'status') {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    jsonResponse(200, [
        'configured' => $configured,
        'connected' => isset($_SESSION['netlify_access_token']),
        'csrf' => $_SESSION['csrf_token'],
    ]);
}

if ($action === 'login') {
    if (!$configured) {
        jsonResponse(503, ['error' => 'Konfigurasi OAuth Netlify belum dipasang di server.']);
    }
    $_SESSION['oauth_state'] = bin2hex(random_bytes(32));
    $query = http_build_query([
        'client_id' => $clientId,
        'response_type' => 'code',
        'redirect_uri' => $redirectUri,
        'state' => $_SESSION['oauth_state'],
    ]);
    header('Location: https://app.netlify.com/authorize?' . $query, true, 302);
    exit;
}

if ($action === 'callback') {
    if (isset($_GET['error'])) {
        header('Location: index.html?netlify=error', true, 302);
        exit;
    }
    $state = $_GET['state'] ?? '';
    $expectedState = $_SESSION['oauth_state'] ?? '';
    $code = $_GET['code'] ?? '';
    unset($_SESSION['oauth_state']);

    if (!$configured || $state === '' || $expectedState === '' || !hash_equals($expectedState, $state) || $code === '') {
        header('Location: index.html?netlify=error', true, 302);
        exit;
    }

    try {
        $curl = curl_init('https://api.netlify.com/oauth/token');
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query([
                'grant_type' => 'authorization_code',
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $code,
                'redirect_uri' => $redirectUri,
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 30,
        ]);
        $responseBody = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);

        if ($responseBody === false || $status < 200 || $status >= 300) {
            throw new RuntimeException(
                $responseBody === false
                    ? 'Koneksi ke Netlify gagal: ' . $curlError
                    : 'Netlify tidak menyelesaikan otorisasi (HTTP ' . $status . ').'
            );
        }

        $tokenData = json_decode($responseBody, true);
        if (!is_array($tokenData) || empty($tokenData['access_token'])) {
            throw new RuntimeException('Netlify tidak mengembalikan token akses.');
        }
        session_regenerate_id(true);
        $_SESSION['netlify_access_token'] = $tokenData['access_token'];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        unset($_SESSION['netlify_site_id'], $_SESSION['netlify_site_url']);
        header('Location: index.html?netlify=connected', true, 302);
        exit;
    } catch (Throwable $error) {
        error_log('PortoSite Netlify OAuth: ' . $error->getMessage());
        header('Location: index.html?netlify=error', true, 302);
        exit;
    }
}

if ($action === 'logout') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(405, ['error' => 'Metode permintaan tidak didukung.']);
    }
    requireCsrf();
    unset(
        $_SESSION['netlify_access_token'],
        $_SESSION['netlify_site_id'],
        $_SESSION['netlify_site_url']
    );
    jsonResponse(200, ['connected' => false]);
}

if ($action === 'publish') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(405, ['error' => 'Metode permintaan tidak didukung.']);
    }
    requireCsrf();

    $token = $_SESSION['netlify_access_token'] ?? '';
    if ($token === '') {
        jsonResponse(401, ['error' => 'Hubungkan akun Netlify-mu sebelum menerbitkan website.']);
    }
    if (!function_exists('curl_init') || !class_exists('ZipArchive')) {
        jsonResponse(500, ['error' => 'Server memerlukan ekstensi PHP cURL dan ZipArchive untuk menerbitkan website.']);
    }

    $request = json_decode(file_get_contents('php://input'), true);
    $name = is_array($request) ? trim((string) ($request['name'] ?? '')) : '';
    $html = is_array($request) ? ($request['html'] ?? '') : '';
    if ($name === '' || strlen($name) > 240 || !is_string($html) || strlen($html) > 4_500_000) {
        jsonResponse(400, ['error' => 'Data portofolio tidak valid atau ukurannya terlalu besar.']);
    }
    if (strpos($html, '<meta name="generator" content="PortoSite">') === false) {
        jsonResponse(400, ['error' => 'File website tidak dikenali sebagai portofolio PortoSite.']);
    }

    $createdSite = false;
    try {
        $siteId = $_SESSION['netlify_site_id'] ?? '';
        if ($siteId === '') {
            $site = createPortfolioSite($token, $name);
            $siteId = (string) ($site['id'] ?? '');
            if ($siteId === '') {
                throw new RuntimeException('Netlify tidak mengembalikan ID website.');
            }
            $_SESSION['netlify_site_id'] = $siteId;
            $createdSite = true;
        }

        $deploy = deployPortfolio($token, $siteId, $html);
        $deployId = (string) ($deploy['id'] ?? '');
        $ready = waitForDeploy($token, $deployId);
        $url = $_SESSION['netlify_site_url'] ?? '';
        if ($url === '') {
            $siteDetails = netlifyRequest('GET', '/sites/' . rawurlencode($siteId), $token);
            $host = parse_url((string) ($siteDetails['ssl_url'] ?? $siteDetails['url'] ?? ''), PHP_URL_HOST);
            if (!is_string($host) || !preg_match('/^[a-z0-9-]+\.netlify\.app$/i', $host)) {
                throw new RuntimeException('Alamat website Netlify tidak valid.');
            }
            $url = 'https://' . strtolower($host);
            $_SESSION['netlify_site_url'] = $url;
        }
        jsonResponse(200, [
            'url' => $url,
            'deploy_id' => $deployId,
            'ready' => $ready,
        ]);
    } catch (Throwable $error) {
        if ($createdSite && !empty($_SESSION['netlify_site_id'])) {
            try {
                netlifyRequest(
                    'DELETE',
                    '/sites/' . rawurlencode((string) $_SESSION['netlify_site_id']),
                    $token
                );
            } catch (Throwable $cleanupError) {
                error_log('PortoSite Netlify cleanup: ' . $cleanupError->getMessage());
            }
            unset($_SESSION['netlify_site_id'], $_SESSION['netlify_site_url']);
        }
        error_log('PortoSite Netlify publish: ' . $error->getMessage());
        jsonResponse(502, ['error' => $error->getMessage()]);
    }
}

jsonResponse(404, ['error' => 'Aksi tidak ditemukan.']);
