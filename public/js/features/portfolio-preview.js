function renderPortfolio(data) {
  const name = data.name || "Nama Kamu";
  const role = data.role || "Profesi atau peran";
  const labels =
    data.language === "en"
      ? {
          lang: "en",
          portfolio: "PERSONAL PORTFOLIO",
          projects: "SELECTED WORK",
          projectsTitle: "Selected projects",
          projectsAside: "Ideas turned into real work.",
          projectLink: "View project",
          about: "A LITTLE ABOUT ME",
          aboutTitle: "A closer look",
          education: "EDUCATION",
          skills: "SKILLS",
          journey: "THE JOURNEY",
          experience: "Experience",
          connected: "LET'S CONNECT",
          contact: "Let's talk",
          contactHint: "Open to new connections, collaborations, and ideas.",
          maker: "",
          title: "Portfolio",
          photoAlt: "Photo of",
        }
      : {
          lang: "id",
          portfolio: "PORTOFOLIO PERSONAL",
          projects: "YANG SAYA KERJAKAN",
          projectsTitle: "Proyek pilihan",
          projectsAside: "Ide yang berubah menjadi karya.",
          projectLink: "Lihat proyek",
          about: "SEDIKIT TENTANG SAYA",
          aboutTitle: "Mengenal lebih dekat",
          education: "PENDIDIKAN",
          skills: "KEAHLIAN",
          journey: "PERJALANAN",
          experience: "Pengalaman",
          connected: "TERHUBUNG",
          contact: "Mari ngobrol",
          contactHint: "Terbuka untuk kenalan, kolaborasi, dan ide baru.",
          maker: "",
          title: "Portofolio",
          photoAlt: "Foto",
        };
  const chosenPalette = PALETTES[data.accent] || PALETTES.blue;
  const layout = ["editorial", "minimal", "split"].includes(data.layout)
    ? data.layout
    : "editorial";
  const theme = data.theme === "dark" ? "dark" : "light";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "N";
  const projectItems = data.projects
    .filter((item) => item.name)
    .map((item, index) => {
      const url = safeHttpUrl(item.url || "");
      return `<article class="project-card"><div class="project-art project-art-${(index % 3) + 1}"><span>PROJECT / ${String(index + 1).padStart(2, "0")}</span><b aria-hidden="true">✳</b></div><div class="project-copy"><h3>${escapeHtml(item.name)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${labels.projectLink} ↗</a>` : ""}</div></article>`;
    })
    .join("");
  const experienceItems = data.experience
    .filter((item) => item.position || item.company)
    .map(
      (item, index) =>
        `<article class="timeline-item"><span class="number">${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHtml(item.position || item.company)}</h3><p class="meta">${escapeHtml([item.company, item.period].filter(Boolean).join(" · "))}</p>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`,
    )
    .join("");
  const educationItems = data.education
    .filter((item) => item.degree || item.institution)
    .map(
      (item) =>
        `<article class="education-item"><h3>${escapeHtml(item.degree || item.institution)}</h3><p>${escapeHtml([item.institution, item.period].filter(Boolean).join(" · "))}</p></article>`,
    )
    .join("");
  const skillItems = data.skills
    .map((skill) => `<span class="skill">${escapeHtml(skill)}</span>`)
    .join("");
  const socialItems = data.socials
    .map(
      (social) =>
        `<a href="${escapeHtml(social.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(social.label)} ↗</a>`,
    )
    .join("");
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ? data.email
    : "";
  const photo = data.photo
    ? `<img class="profile-photo" src="${escapeHtml(data.photo)}" alt="${labels.photoAlt} ${escapeHtml(name)}">`
    : `<span class="profile-initials">${escapeHtml(initials)}</span>`;

  return `<!doctype html>
<html lang="${labels.lang}" data-layout="${layout}" data-theme="${theme}" style="--blue:${chosenPalette.blue};--orange:${chosenPalette.orange};--accent-soft:${chosenPalette.soft}">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(data.bio || `Portofolio ${name}`)}">
<meta name="theme-color" content="${theme === "dark" ? "#151a18" : "#f5f3ed"}"><meta name="generator" content="PortoSite"><title>${escapeHtml(name)} — ${labels.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--paper:#f5f3ed;--ink:#17211f;--muted:#69716b;--line:#d9d9d0;--blue:#3457e5;--orange:#ff7148;--lime:#d5f068;--accent-soft:#dce4ff}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.7 "DM Sans",sans-serif;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}.wrap{width:min(1000px,calc(100% - 48px));margin:auto}.top{height:76px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:11px;font-weight:800}.mark{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;background:var(--blue);color:#fff;font-family:Manrope,sans-serif}.nav{display:flex;gap:25px;font-size:12px;font-weight:700}.nav a:hover,.social a:hover{color:var(--blue)}.hero{min-height:465px;display:grid;grid-template-columns:1.25fr .75fr;align-items:center;gap:55px;padding:65px 0 76px}.eyebrow{margin:0 0 17px;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.15em}.hero h1,.section-title,.contact h2{margin:0;font:700 clamp(43px,7vw,76px)/1.08 Manrope,sans-serif;letter-spacing:-.065em}.hero h1 span{color:var(--orange)}.role{margin:15px 0 0;color:var(--blue);font-weight:700;font-size:17px}.location{margin:4px 0;color:var(--muted);font-size:12px}.bio{max-width:500px;color:var(--muted);font-size:14px;line-height:1.8}.portrait{position:relative;display:grid;min-height:290px;place-items:center;overflow:hidden;background:var(--accent-soft);color:var(--blue)}.portrait:before,.portrait:after{position:absolute;width:230px;height:230px;border:1px solid currentColor;border-radius:50%;content:""}.portrait:after{width:160px;height:160px;border-style:dashed}.profile-initials{position:relative;z-index:1;font:800 78px Manrope,sans-serif;letter-spacing:-.09em}.profile-photo{position:absolute;z-index:1;width:100%;height:100%;object-fit:cover}.section{padding:64px 0;border-top:1px solid var(--line)}.section-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:28px}.section-title{font-size:clamp(34px,5vw,52px)}.section-title span{color:var(--orange)}.aside{margin:0;color:var(--muted);font-size:12px}.projects{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.project-card{border:1px solid var(--line);background:var(--card,#fbfaf6)}.project-art{height:205px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:var(--accent-soft);color:var(--blue)}.project-art-2{background:color-mix(in srgb,var(--accent-soft) 58%,var(--orange));color:var(--orange)}.project-art-3{background:color-mix(in srgb,var(--accent-soft) 60%,var(--lime));color:var(--blue)}.project-art:before,.project-art:after{content:"";position:absolute;width:150px;height:150px;border:1px solid currentColor;border-radius:50%}.project-art:after{width:100px;height:100px;border-style:dashed}.project-art span{position:absolute;top:14px;left:16px;font-size:9px;font-weight:700;letter-spacing:.1em}.project-art b{z-index:1;font-size:55px}.project-copy{padding:18px 20px 21px}.project-copy h3,.timeline-item h3,.education-item h3{margin:0;font:700 16px Manrope,sans-serif;letter-spacing:-.03em}.project-copy p,.timeline-item p,.education-item p{margin:7px 0 0;color:var(--muted);font-size:12px}.project-copy a{display:inline-block;margin-top:11px;color:var(--blue);font-size:11px;font-weight:700}.about{display:grid;grid-template-columns:1fr 1fr;gap:60px}.about-copy{max-width:450px;color:var(--muted);font-size:14px}.detail-title{margin:0 0 13px;color:var(--muted);font-size:9px;font-weight:700;letter-spacing:.13em}.skills{display:flex;flex-wrap:wrap;gap:8px}.skill{padding:6px 11px;border:1px solid var(--line);border-radius:99px;font-size:11px;font-weight:600}.education-list{display:grid;gap:16px;margin-top:26px}.education-item{padding-bottom:14px;border-bottom:1px solid var(--line)}.timeline{border-top:1px solid var(--line)}.timeline-item{display:grid;grid-template-columns:55px 1fr;gap:10px;padding:19px 0;border-bottom:1px solid var(--line)}.number{color:var(--orange);font-size:11px;font-weight:700}.contact{margin:35px 0 0;padding:52px 45px;background:var(--ink);color:#fff}.contact h2{font-size:clamp(38px,6vw,64px)}.contact p{color:#c0c8c1}.social{display:flex;flex-wrap:wrap;gap:18px;margin-top:22px;font-size:12px;font-weight:700}.social a{color:var(--lime)}.contact-email{display:inline-block;margin-top:22px;padding-bottom:4px;border-bottom:1px solid #89918a;font-size:13px}.footer{display:flex;justify-content:space-between;gap:15px;padding:22px 0;color:var(--muted);font-size:10px}
html[data-theme="dark"]{color-scheme:dark;--paper:#151a18;--ink:#edf1eb;--muted:#a5aea6;--line:#343d38;--card:#202724;--accent-soft:#252e29}html[data-theme="dark"] .contact{background:#080b0a;color:#edf1eb}
html[data-layout="minimal"] .hero{min-height:340px;grid-template-columns:1fr 155px;gap:38px;padding-block:48px}html[data-layout="minimal"] .portrait{min-height:155px;border-radius:50%}
html[data-layout="split"] .hero{grid-template-columns:.72fr 1.28fr;gap:36px}html[data-layout="split"] .portrait{min-height:410px}
*{scrollbar-width:none}*::-webkit-scrollbar{width:0;height:0}html.scrollbars-visible *{scrollbar-color:#929990 transparent;scrollbar-width:thin}html.scrollbars-visible *::-webkit-scrollbar{width:6px;height:6px}html.scrollbars-visible *::-webkit-scrollbar-thumb{border-radius:6px;background:#929990}html.scrollbars-visible *::-webkit-scrollbar-track{background:transparent}
@media(max-width:650px){.wrap{width:calc(100% - 36px)}.top{height:66px}.nav{gap:13px}.nav a:nth-child(2),.nav a:nth-child(3){display:none}.hero{grid-template-columns:1fr;gap:25px;padding:48px 0 55px}.portrait{min-height:235px}.section{padding:48px 0}.section-head{align-items:start;flex-direction:column;gap:8px}.projects,.about{grid-template-columns:1fr}.about{gap:25px}.contact{padding:37px 23px}.footer{flex-wrap:wrap}html[data-layout="minimal"] .hero,html[data-layout="split"] .hero{grid-template-columns:1fr;gap:25px}html[data-layout="minimal"] .portrait{min-height:200px;max-width:240px;border-radius:0}html[data-layout="split"] .portrait{min-height:260px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body><header class="wrap top"><a class="brand" href="#beranda" aria-label="${escapeHtml(name)}"><span class="mark">${escapeHtml(initials)}</span><span>${escapeHtml(name)}</span></a><nav class="nav">${projectItems ? `<a href="#proyek">${labels.projects}</a>` : ""}${skillItems || educationItems ? `<a href="#tentang">${labels.about}</a>` : ""}${experienceItems ? `<a href="#pengalaman">${labels.experience}</a>` : ""}${email || socialItems ? `<a href="#kontak">${labels.contact} ↗</a>` : ""}</nav></header>
<main class="wrap"><section class="hero" id="beranda"><div><p class="eyebrow">${labels.portfolio}${data.location ? ` · ${escapeHtml(data.location.toUpperCase())}` : ""}</p><h1>${data.language === "en" ? "Hi, I'm" : "Halo, saya"}<br>${escapeHtml(name)}<span>.</span></h1><p class="role">${escapeHtml(role)}</p>${data.location ? `<p class="location">${escapeHtml(data.location)}</p>` : ""}${data.bio ? `<p class="bio">${escapeHtml(data.bio)}</p>` : ""}</div><div class="portrait">${photo}</div></section>
${projectItems ? `<section class="section" id="proyek"><div class="section-head"><div><p class="eyebrow">${labels.projects}</p><h2 class="section-title">${labels.projectsTitle}<span>.</span></h2></div><p class="aside">${labels.projectsAside}</p></div><div class="projects">${projectItems}</div></section>` : ""}
${skillItems || educationItems ? `<section class="section about" id="tentang"><div><p class="eyebrow">${labels.about}</p><h2 class="section-title">${labels.aboutTitle}<span>.</span></h2>${data.bio ? `<p class="about-copy">${escapeHtml(data.bio)}</p>` : ""}${educationItems ? `<div class="education-list"><p class="detail-title">${labels.education}</p>${educationItems}</div>` : ""}</div><div>${skillItems ? `<p class="detail-title">${labels.skills}</p><div class="skills">${skillItems}</div>` : ""}</div></section>` : ""}
${experienceItems ? `<section class="section" id="pengalaman"><div class="section-head"><div><p class="eyebrow">${labels.journey}</p><h2 class="section-title">${labels.experience}<span>.</span></h2></div></div><div class="timeline">${experienceItems}</div></section>` : ""}
${email || socialItems ? `<section class="contact" id="kontak"><p class="eyebrow">${labels.connected}</p><h2>${labels.contact}<span style="color:var(--lime)">.</span></h2><p>${labels.contactHint}</p><div class="social">${socialItems}</div>${email ? `<a class="contact-email" href="mailto:${escapeHtml(email)}">${escapeHtml(email)} ↗</a>` : ""}</section>` : ""}
</main><footer class="wrap footer"><span>© ${new Date().getFullYear()} ${escapeHtml(name)}</span>${labels.maker ? `<span>${labels.maker}</span>` : ""}</footer><script>document.addEventListener("click",event=>{const link=event.target.closest('a[href^="#"]');if(!link)return;const target=document.getElementById(link.getAttribute("href").slice(1));if(!target)return;event.preventDefault();target.scrollIntoView({behavior:"smooth",block:"start"})});let scrollbarTimer;const showScrollbars=()=>{document.documentElement.classList.add("scrollbars-visible");clearTimeout(scrollbarTimer);scrollbarTimer=setTimeout(()=>document.documentElement.classList.remove("scrollbars-visible"),900)};window.addEventListener("scroll",showScrollbars,{passive:true});document.addEventListener("scroll",showScrollbars,true);<\/script></body></html>`;
}

function updatePreview() {
  const data = collectData();
  frame.srcdoc = renderPortfolio(data);
  saveDraft();
}
