function addEntry(kind, values = {}) {
  const config = ENTRY_CONFIG[kind];
  const container = document.getElementById(config.container);
  if (container.children.length >= MAX_ENTRIES) {
    showToast(
      `${translate("maxEntries")} ${MAX_ENTRIES} ${translate(config.title).toLowerCase()}.`,
    );
    return;
  }

  const card = document.createElement("div");
  card.className = "repeat-card";
  card.dataset.kind = kind;

  const heading = document.createElement("div");
  heading.className = "repeat-card-heading";
  const number = document.createElement("span");
  number.textContent = `${translate(config.title)} ${container.children.length + 1}`;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-entry";
  remove.textContent = translate("delete");
  remove.addEventListener("click", () => {
    card.remove();
    updatePreview();
  });
  heading.append(number, remove);
  card.append(heading);

  config.fields.forEach(([key, labelKey, placeholderKey]) => {
    const label = document.createElement("label");
    label.className = "field repeat-field";
    label.append(document.createTextNode(translate(labelKey)));
    const input =
      key === "description" && kind !== "project"
        ? document.createElement("textarea")
        : document.createElement("input");
    input.name = key;
    input.dataset.field = key;
    input.maxLength = key === "description" ? 240 : 160;
    input.placeholder = translate(placeholderKey);
    input.value = values[key] || "";
    input.addEventListener("input", updatePreview);
    label.append(input);
    card.append(label);
  });
  container.append(card);
}

function collectEntries(kind) {
  const container = document.getElementById(ENTRY_CONFIG[kind].container);
  return [...container.querySelectorAll(".repeat-card")]
    .map((card) => {
      const entry = {};
      card.querySelectorAll("[data-field]").forEach((input) => {
        entry[input.dataset.field] = input.value.trim();
      });
      return entry;
    })
    .filter((entry) => Object.values(entry).some(Boolean));
}

function collectData() {
  const values = new FormData(form);
  const instagram = String(values.get("instagram") || "")
    .trim()
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9._]/g, "");
  const whatsapp = safeWhatsAppUrl(String(values.get("whatsapp") || "").trim());
  const profileLinks = [
    ["LinkedIn", values.get("linkedin")],
    ["GitHub", values.get("github")],
    ["Website", values.get("website")],
    ["TikTok", values.get("tiktok")],
    ["Facebook", values.get("facebook")],
    ["YouTube", values.get("youtube")],
    ["X", values.get("xSocial")],
    ["Telegram", values.get("telegram")],
  ];
  return {
    name: String(values.get("name") || "").trim(),
    role: String(values.get("role") || "").trim(),
    location: String(values.get("location") || "").trim(),
    email: String(values.get("email") || "").trim(),
    bio: String(values.get("bio") || "").trim(),
    skills: String(values.get("skills") || "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean)
      .slice(0, 20),
    photo: photoData,
    projects: collectEntries("project"),
    experience: collectEntries("experience"),
    education: collectEntries("education"),
    accent: palette,
    layout: portfolioLayout,
    theme: String(values.get("portfolioTheme") || "light"),
    language,
    socials: [
      instagram
        ? { label: "Instagram", url: `https://instagram.com/${instagram}` }
        : null,
      whatsapp ? { label: "WhatsApp", url: whatsapp } : null,
      ...profileLinks,
    ]
      .filter(Boolean)
      .map((social) => {
        if (Array.isArray(social)) {
          const url = safeHttpUrl(String(social[1] || ""));
          return url ? { label: social[0], url } : null;
        }
        return social;
      })
      .filter(Boolean),
  };
}

function collectFormFields() {
  return Object.fromEntries(
    [...form.querySelectorAll("input[name], textarea[name], select[name]")]
      .filter(
        (element) =>
          !element.closest(".repeat-card") && element.type !== "file",
      )
      .map((element) => [element.name, element.value]),
  );
}

function saveDraft() {
  const draft = {
    fields: collectFormFields(),
    photo: photoData,
    palette,
    layout: portfolioLayout,
    projects: collectEntries("project"),
    experience: collectEntries("experience"),
    education: collectEntries("education"),
  };
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    sessionStorage.removeItem(LEGACY_DRAFT_KEY);
    document.getElementById("saved-indicator").classList.remove("save-warning");
    document.getElementById("saved-indicator").querySelector("span").textContent =
      translate("savedBrowser");
  } catch {
    document.getElementById("saved-indicator").classList.add("save-warning");
    document.getElementById("saved-indicator").querySelector("span").textContent =
      translate("storageFull");
  }
}

function restoreDraft() {
  const saved =
    sessionStorage.getItem(DRAFT_KEY) ||
    sessionStorage.getItem(LEGACY_DRAFT_KEY);
  if (!saved) return;
  try {
    const draft = JSON.parse(saved);
    for (const [name, value] of Object.entries(draft.fields || {})) {
      const input = [...form.querySelectorAll("[name]")].find(
        (element) =>
          element.name === name &&
          !element.closest(".repeat-card") &&
          element.type !== "file",
      );
      if (input && typeof value === "string") input.value = value;
    }
    photoData = draft.photo || "";
    palette = PALETTES[draft.palette] ? draft.palette : "blue";
    portfolioLayout = ["editorial", "minimal", "split"].includes(draft.layout)
      ? draft.layout
      : "editorial";
    document.querySelectorAll("[data-palette]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.palette === palette);
    });
    document.querySelectorAll("[data-layout-choice]").forEach((button) => {
      button.classList.toggle(
        "selected",
        button.dataset.layoutChoice === portfolioLayout,
      );
    });
    if (photoData) showPhoto(photoData);
    const entriesByKind = {
      project: draft.projects,
      experience: draft.experience,
      education: draft.education,
    };
    for (const [kind, entries] of Object.entries(entriesByKind)) {
      (entries || []).forEach((entry) => addEntry(kind, entry));
    }
  } catch {
    sessionStorage.removeItem(DRAFT_KEY);
    showToast(translate("badDraft"));
  }
}

function showPhoto(dataUrl) {
  const image = document.getElementById("photo-image");
  image.src = dataUrl;
  image.hidden = false;
  document.getElementById("photo-placeholder").hidden = true;
  document.getElementById("remove-photo").hidden = false;
}
