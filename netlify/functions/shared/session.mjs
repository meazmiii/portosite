import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const COOKIE_NAME = "portosite_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function sessionKey(secret) {
  return createHash("sha256").update(secret).digest();
}

export function encodeSession(session, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decodeSession(cookieHeader, secret) {
  const cookie = (cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return {};

  try {
    const data = Buffer.from(cookie.slice(COOKIE_NAME.length + 1), "base64url");
    if (data.length < 29) return {};
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(secret), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const plaintext = Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function cookieValue(value, event, maxAge = SESSION_MAX_AGE) {
  const forwardedProto = event.headers["x-forwarded-proto"] || "";
  const host = event.headers.host || "";
  const isLocalHttp = ["localhost", "127.0.0.1"].some((hostname) => host.startsWith(`${hostname}:`));
  const secure = forwardedProto === "https" || (!isLocalHttp && forwardedProto !== "http");
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function csrfIsValid(event, session) {
  const provided = event.headers["x-csrf-token"] || "";
  const expected = typeof session.csrf === "string" ? session.csrf : "";
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}
