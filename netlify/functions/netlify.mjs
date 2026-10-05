import { randomBytes } from "node:crypto";
import { csrfIsValid, cookieValue, decodeSession, encodeSession } from "./shared/session.mjs";
import { json, redirect } from "./shared/http.mjs";
import { publishPortfolio } from "./features/deploy.mjs";

function getConfig() {
  const clientId = process.env.NETLIFY_CLIENT_ID || "";
  const clientSecret = process.env.NETLIFY_CLIENT_SECRET || "";
  const redirectUri = process.env.NETLIFY_REDIRECT_URI || "";
  const sessionSecret = process.env.PORTOSITE_SESSION_SECRET || "";

  try {
    const callback = new URL(redirectUri);
    const localHttp = callback.protocol === "http:" && ["localhost", "127.0.0.1"].includes(callback.hostname);
    if (
      !clientId ||
      !clientSecret ||
      sessionSecret.length < 32 ||
      !(callback.protocol === "https:" || localHttp) ||
      !callback.pathname.endsWith("/.netlify/functions/netlify")
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return { clientId, clientSecret, redirectUri, sessionSecret };
}

function appUrl(config) {
  return new URL("/", config.redirectUri).toString();
}

export async function handler(event) {
  const action = event.queryStringParameters?.action || "";
  const config = getConfig();

  if (action === "status") {
    if (!config) {
      return json(200, { configured: false, connected: false, csrf: "" });
    }
    const session = decodeSession(event.headers.cookie, config.sessionSecret);
    if (!session.csrf) session.csrf = randomBytes(32).toString("hex");
    return json(
      200,
      {
        configured: true,
        connected: typeof session.accessToken === "string" && Boolean(session.accessToken),
        csrf: session.csrf,
      },
      { "Set-Cookie": cookieValue(encodeSession(session, config.sessionSecret), event) },
    );
  }

  if (!config) {
    return json(503, { error: "Upload Netlify belum dikonfigurasi untuk PortoSite." });
  }

  if (action === "login" && event.httpMethod === "GET") {
    const session = decodeSession(event.headers.cookie, config.sessionSecret);
    session.csrf ||= randomBytes(32).toString("hex");
    session.oauthState = randomBytes(32).toString("hex");
    const authorization = new URL("https://app.netlify.com/authorize");
    authorization.searchParams.set("client_id", config.clientId);
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("redirect_uri", config.redirectUri);
    authorization.searchParams.set("state", session.oauthState);
    return redirect(
      authorization.toString(),
      cookieValue(encodeSession(session, config.sessionSecret), event),
    );
  }

  if (action === "callback" && event.httpMethod === "GET") {
    const session = decodeSession(event.headers.cookie, config.sessionSecret);
    const code = event.queryStringParameters?.code || "";
    const state = event.queryStringParameters?.state || "";
    const expectedState = typeof session.oauthState === "string" ? session.oauthState : "";
    delete session.oauthState;

    if (
      event.queryStringParameters?.error ||
      !code ||
      !state ||
      !expectedState ||
      !csrfIsValid({ headers: { "x-csrf-token": state } }, { csrf: expectedState })
    ) {
      return redirect(`${appUrl(config)}?netlify=error`);
    }

    try {
      const response = await fetch("https://api.netlify.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const tokenData = await response.json();
      if (!response.ok || !tokenData.access_token) {
        throw new Error(`Netlify tidak menyelesaikan otorisasi (HTTP ${response.status}).`);
      }

      const authenticatedSession = {
        accessToken: tokenData.access_token,
        csrf: randomBytes(32).toString("hex"),
      };
      return redirect(
        `${appUrl(config)}?netlify=connected`,
        cookieValue(encodeSession(authenticatedSession, config.sessionSecret), event),
      );
    } catch (error) {
      console.error("PortoSite Netlify OAuth:", error);
      return redirect(`${appUrl(config)}?netlify=error`);
    }
  }

  if (action === "logout" && event.httpMethod === "POST") {
    const session = decodeSession(event.headers.cookie, config.sessionSecret);
    if (!csrfIsValid(event, session)) {
      return json(403, { error: "Sesi keamanan tidak valid. Muat ulang halaman lalu coba lagi." });
    }
    return json(
      200,
      { connected: false },
      { "Set-Cookie": cookieValue("", event, 0) },
    );
  }

  if (action === "publish" && event.httpMethod === "POST") {
    const session = decodeSession(event.headers.cookie, config.sessionSecret);
    if (!csrfIsValid(event, session)) {
      return json(403, { error: "Sesi keamanan tidak valid. Muat ulang halaman lalu coba lagi." });
    }
    if (!session.accessToken) {
      return json(401, { error: "Hubungkan akun Netlify-mu sebelum menerbitkan website." });
    }

    let request;
    try {
      request = JSON.parse(event.body || "");
    } catch {
      return json(400, { error: "Data portofolio tidak valid." });
    }
    const name = request && typeof request.name === "string" ? request.name.trim() : "";
    const html = request && typeof request.html === "string" ? request.html : "";
    if (
      !name ||
      name.length > 240 ||
      Buffer.byteLength(html, "utf8") > 4_500_000
    ) {
      return json(400, { error: "Data portofolio tidak valid atau ukurannya terlalu besar." });
    }
    if (!html.includes('<meta name="generator" content="PortoSite">')) {
      return json(400, { error: "File website tidak dikenali sebagai portofolio PortoSite." });
    }

    try {
      const result = await publishPortfolio(session.accessToken, session, name, html);
      return json(
        200,
        { url: result.url, deploy_id: result.deployId, ready: result.ready },
        { "Set-Cookie": cookieValue(encodeSession(session, config.sessionSecret), event) },
      );
    } catch (error) {
      console.error("PortoSite Netlify publish:", error);
      return json(502, { error: error.message || "Netlify gagal menerbitkan website." });
    }
  }

  if (["logout", "publish"].includes(action)) {
    return json(405, { error: "Metode permintaan tidak didukung." });
  }
  return json(404, { error: "Aksi tidak ditemukan." });
}
