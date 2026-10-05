const form = document.getElementById("portfolio-form");
const frame = document.getElementById("preview-frame");
const toast = document.getElementById("toast");
let language = localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "id";
let appTheme = localStorage.getItem(APP_THEME_KEY) === "dark" ? "dark" : "light";
let palette = "blue";
let portfolioLayout = "editorial";
let photoData = "";
let isNetlifyConnected = false;
let netlifyReady = false;
let csrfToken = "";
let toastTimer;
const scrollbarTimers = new WeakMap();

function revealScrollbars(root = document.documentElement) {
  root.classList.add("scrollbars-visible");
  clearTimeout(scrollbarTimers.get(root));
  scrollbarTimers.set(
    root,
    setTimeout(() => root.classList.remove("scrollbars-visible"), 900),
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function safeHttpUrl(value) {
  const candidate = value.trim();
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function safeWhatsAppUrl(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) {
    return "";
  }
  return `https://wa.me/${digits}`;
}

function translate(key) {
  return DICTIONARY[language][key] || DICTIONARY.id[key] || key;
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.title =
    language === "en"
      ? "PortoSite — Build your portfolio"
      : "PortoSite — Bikin portofolio sendiri";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.dataset.i18n === "optional") {
      element.textContent = "*";
      element.setAttribute("aria-label", translate("optional"));
      return;
    }
    element.textContent = translate(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = translate(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute(
      "aria-label",
      translate(element.dataset.i18nAria),
    );
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    element.alt = translate(element.dataset.i18nAlt);
  });
  document.getElementById("language-button").textContent =
    DICTIONARY[language].langButton;
  document.getElementById("theme-button").setAttribute(
    "aria-label",
    appTheme === "dark"
      ? translate("themeButtonLight")
      : translate("themeButtonDark"),
  );
  document.getElementById("theme-button").innerHTML =
    appTheme === "dark" ? '<span aria-hidden="true">☀</span>' : '<span aria-hidden="true">☾</span>';
  document.getElementById("saved-indicator").querySelector("span").textContent =
    translate("saved");

  const entrySnapshot = Object.fromEntries(
    Object.keys(ENTRY_CONFIG).map((kind) => [kind, collectEntries(kind)]),
  );
  Object.values(ENTRY_CONFIG).forEach((config) => {
    document.getElementById(config.container).replaceChildren();
  });
  Object.entries(entrySnapshot).forEach(([kind, entries]) => {
    entries.forEach((entry) => addEntry(kind, entry));
  });
  updatePreview();
}

function applyAppTheme() {
  document.body.classList.toggle("dark-mode", appTheme === "dark");
  document.getElementById("theme-button").setAttribute(
    "aria-label",
    appTheme === "dark"
      ? translate("themeButtonLight")
      : translate("themeButtonDark"),
  );
  try {
    localStorage.setItem(APP_THEME_KEY, appTheme);
  } catch {
    showToast(
      language === "en"
        ? "Your theme preference could not be saved."
        : "Preferensi tema tidak dapat disimpan.",
    );
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 4200);
}

function slugify(value) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 45) || "portofolio"
  );
}
