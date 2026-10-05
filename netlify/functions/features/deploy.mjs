import { randomBytes } from "node:crypto";
import archiver from "archiver";

async function netlifyRequest(method, path, token, body, contentType = "application/json") {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = contentType;

  const response = await fetch(`https://api.netlify.com/api/v1${path}`, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(25_000),
  });
  const text = await response.text();
  let result = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    const message = result.message || result.error_description || result.error;
    throw new Error(
      `Netlify menolak permintaan (HTTP ${response.status}). ${message || "Periksa akun dan izin Netlify-mu."}`,
    );
  }
  return result;
}

function createSiteName(name) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 44) || "portofolio";
  return `${slug}-${randomBytes(3).toString("hex")}`;
}

function netlifySiteUrl(site) {
  const rawUrl = site.ssl_url || site.url || "";
  if (!rawUrl) return "";
  const parsedUrl = new URL(rawUrl);
  if (
    parsedUrl.protocol !== "https:" ||
    !/^[a-z0-9-]+\.netlify\.app$/i.test(parsedUrl.hostname)
  ) {
    throw new Error("Alamat website Netlify tidak valid.");
  }
  return parsedUrl.origin;
}

function zipPortfolio(html) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.append(html, { name: "index.html" });
    archive.finalize().catch(reject);
  });
}

export async function publishPortfolio(token, session, name, html) {
  let createdSite = false;
  let siteId = typeof session.siteId === "string" ? session.siteId : "";
  try {
    if (!siteId) {
      const site = await netlifyRequest(
        "POST",
        "/sites",
        token,
        JSON.stringify({ name: createSiteName(name) }),
      );
      siteId = String(site.id || "");
      if (!siteId) throw new Error("Netlify tidak mengembalikan ID website.");
      session.siteId = siteId;
      createdSite = true;
      session.siteUrl = netlifySiteUrl(site);
    }

    const archive = await zipPortfolio(html);
    const deploy = await netlifyRequest(
      "POST",
      `/sites/${encodeURIComponent(siteId)}/deploys`,
      token,
      archive,
      "application/zip",
    );
    const deployId = String(deploy.id || "");
    if (!deployId) throw new Error("Netlify tidak mengembalikan ID deployment.");

    let siteUrl = typeof session.siteUrl === "string" ? session.siteUrl : "";
    if (!siteUrl) {
      const site = await netlifyRequest("GET", `/sites/${encodeURIComponent(siteId)}`, token);
      siteUrl = netlifySiteUrl(site);
      if (!siteUrl) throw new Error("Netlify tidak mengembalikan alamat website.");
      session.siteUrl = siteUrl;
    }

    return { url: siteUrl, deployId, ready: String(deploy.state || "").toLowerCase() === "ready" };
  } catch (error) {
    if (createdSite && siteId) {
      try {
        await netlifyRequest("DELETE", `/sites/${encodeURIComponent(siteId)}`, token);
      } catch (cleanupError) {
        console.error("PortoSite Netlify cleanup:", cleanupError);
      }
      delete session.siteId;
      delete session.siteUrl;
    }
    throw error;
  }
}
