window.addEventListener("scroll", () => revealScrollbars(), { passive: true });
frame.addEventListener("load", () => {
  const previewDocument = frame.contentDocument;
  const previewWindow = frame.contentWindow;
  if (!previewDocument || !previewWindow) return;

  const showPreviewScrollbars = () =>
    revealScrollbars(previewDocument.documentElement);
  previewWindow.addEventListener("scroll", showPreviewScrollbars, {
    passive: true,
  });
  previewDocument.addEventListener("scroll", showPreviewScrollbars, true);
});

form.addEventListener("input", updatePreview);
form.addEventListener("submit", (event) => event.preventDefault());
document.querySelectorAll("[data-add]").forEach((button) => {
  button.addEventListener("click", () => {
    addEntry(button.dataset.add);
    updatePreview();
  });
});

document.getElementById("photo").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showToast(translate("photoFormat"));
    event.target.value = "";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast(translate("photoSize"));
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    photoData = String(reader.result || "");
    showPhoto(photoData);
    updatePreview();
  });
  reader.addEventListener("error", () => showToast(translate("photoReadError")));
  reader.readAsDataURL(file);
});

document.getElementById("remove-photo").addEventListener("click", () => {
  photoData = "";
  document.getElementById("photo").value = "";
  document.getElementById("photo-image").hidden = true;
  document.getElementById("photo-placeholder").hidden = false;
  document.getElementById("remove-photo").hidden = true;
  updatePreview();
});

document
  .getElementById("download-button")
  .addEventListener("click", downloadPortfolio);
document.getElementById("netlify-button").addEventListener("click", () => {
  if (isNetlifyConnected) {
    publishPortfolio();
    return;
  }
  if (!netlifyReady) {
    showToast(translate("publishNotReady"));
    return;
  }
  saveDraft();
  const loginUrl = new URL("/.netlify/functions/netlify", window.location.origin);
  loginUrl.searchParams.set("action", "login");
  window.location.assign(loginUrl.href);
});

document.querySelectorAll("[data-device]").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-device]")
      .forEach((item) => item.classList.toggle("selected", item === button));
    document
      .querySelector(".preview-frame-wrap")
      .classList.toggle("mobile-preview", button.dataset.device === "mobile");
  });
});

document.querySelectorAll("[data-palette]").forEach((button) => {
  button.addEventListener("click", () => {
    palette = button.dataset.palette;
    document.querySelectorAll("[data-palette]").forEach((choice) => {
      choice.classList.toggle("selected", choice === button);
    });
    updatePreview();
  });
});

document.querySelectorAll("[data-layout-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    portfolioLayout = button.dataset.layoutChoice;
    document.querySelectorAll("[data-layout-choice]").forEach((choice) => {
      choice.classList.toggle("selected", choice === button);
    });
    updatePreview();
  });
});

document.getElementById("language-button").addEventListener("click", () => {
  language = language === "id" ? "en" : "id";
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    showToast(
      language === "en"
        ? "Your language preference could not be saved."
        : "Preferensi bahasa tidak dapat disimpan.",
    );
  }
  applyLanguage();
  applyAppTheme();
  checkNetlifyStatus();
});

document.getElementById("theme-button").addEventListener("click", () => {
  appTheme = appTheme === "light" ? "dark" : "light";
  applyAppTheme();
});

document.getElementById("disconnect-button")?.addEventListener("click", async () => {
  try {
    await netlifyRequest("logout", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken },
    });
    setNetlifyConnected(false);
    await checkNetlifyStatus();
  } catch (error) {
    showToast(error.message);
  }
});

restoreDraft();
applyAppTheme();
applyLanguage();
if (!document.getElementById("projects-fields").children.length) addEntry("project");
if (!document.getElementById("experience-fields").children.length) addEntry("experience");
if (!document.getElementById("education-fields").children.length) addEntry("education");

const authStatus = new URLSearchParams(window.location.search).get("netlify");
if (authStatus === "connected") {
  history.replaceState({}, "", window.location.pathname);
  showToast(translate("oauthSuccess"));
} else if (authStatus === "error") {
  history.replaceState({}, "", window.location.pathname);
  showToast(translate("oauthError"));
}

updatePreview();
checkNetlifyStatus();
