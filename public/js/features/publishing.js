async function downloadPortfolio() {
  if (!form.reportValidity()) return;
  const data = collectData();
  const blob = new Blob([renderPortfolio(data)], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(data.name)}-portofolio.html`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function netlifyRequest(action, options = {}) {
  const url = new URL("/.netlify/functions/netlify", window.location.origin);
  url.searchParams.set("action", action);
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Permintaan ke server gagal.");
  }
  return result;
}

function setNetlifyConnected(connected) {
  isNetlifyConnected = connected;
  const button = document.getElementById("netlify-button");
  const status = document.getElementById("auth-status");
  const disconnect = document.getElementById("disconnect-button");
  button.querySelector("[data-i18n]").textContent = connected
    ? translate("publishPortfolio")
    : translate("connectNetlify");
  status.textContent = connected
    ? translate("connected")
    : translate("disconnected");
  if (disconnect) disconnect.hidden = !connected;
}

async function checkNetlifyStatus() {
  if (window.location.hostname.endsWith(".github.io")) {
    netlifyReady = false;
    const button = document.getElementById("netlify-button");
    setNetlifyConnected(false);
    button.disabled = true;
    button.querySelector("[data-i18n]").textContent =
      translate("netlifyGithubPagesButton");
    document.getElementById("auth-status").textContent =
      translate("netlifyGithubPagesUnavailable");
    return;
  }
  if (!["http:", "https:"].includes(window.location.protocol)) {
    netlifyReady = false;
    document.getElementById("auth-status").textContent =
      translate("netlifyNeedsServer");
    return;
  }
  try {
    const result = await netlifyRequest("status");
    netlifyReady = Boolean(result.configured);
    csrfToken = result.csrf || "";
    setNetlifyConnected(Boolean(result.connected));
    if (!result.configured) {
      document.getElementById("auth-status").textContent =
        translate("netlifyNotConfigured");
    }
  } catch (error) {
    netlifyReady = false;
    document.getElementById("auth-status").textContent =
      translate("netlifyUnavailable");
  }
}

async function publishPortfolio() {
  if (!form.reportValidity()) return;
  const button = document.getElementById("netlify-button");
  button.disabled = true;
  button.querySelector("[data-i18n]").textContent = translate("publishing");
  try {
    const data = collectData();
    const result = await netlifyRequest("publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        name: data.name,
        html: renderPortfolio(data),
      }),
    });
    showToast(
      result.ready
        ? `${translate("published")} ${result.url}`
        : `${translate("processing")} ${result.url}`,
    );
    window.open(result.url, "_blank", "noopener,noreferrer");
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    setNetlifyConnected(isNetlifyConnected);
  }
}
