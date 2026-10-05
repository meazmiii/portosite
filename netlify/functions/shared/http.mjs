export function json(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
    body: JSON.stringify(payload),
  };
}

export function redirect(location, cookie) {
  return {
    statusCode: 302,
    headers: {
      "Cache-Control": "no-store",
      Location: location,
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
    body: "",
  };
}
