import "./styles.css";
import { LOCALES, setLocale, t } from "./i18n";
import { modules, planned } from "./modules/registry";

setLocale("ko");

const app = document.getElementById("app")!;
let cleanup: (() => void) | null = null;

type Theme = "auto" | "light" | "dark";
const THEMES: Theme[] = ["auto", "light", "dark"];
function applyTheme(th: Theme) {
  if (th === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = th;
  try { localStorage.setItem("railsim.theme", th); } catch { /* 저장 불가 환경 무시 */ }
}
function savedTheme(): Theme {
  try { return (localStorage.getItem("railsim.theme") as Theme) || "auto"; } catch { return "auto"; }
}
applyTheme(savedTheme());

function shell(): HTMLElement {
  app.innerHTML = `
    <button class="skip" id="skip">${t("app.skip")}</button>
    <header class="site-header">
      <a class="brand" href="#/"><span class="logo" aria-hidden="true">🚆</span>${t("app.name")}</a>
      <div class="tools">
        <label class="sr-only" for="lang">${t("nav.language")}</label>
        <select id="lang">${LOCALES.map(l => `<option value="${l.code}">${l.label}</option>`).join("")}</select>
        <label class="sr-only" for="theme">${t("nav.theme")}</label>
        <select id="theme">${THEMES.map(x => `<option value="${x}">${t(`theme.${x}` as "theme.auto")}</option>`).join("")}</select>
      </div>
    </header>
    <main id="main" tabindex="-1"></main>
    <footer class="site-footer">${t("app.footer")}</footer>`;
  app.querySelector<HTMLElement>("#skip")!.onclick = () => app.querySelector<HTMLElement>("#main")!.focus();
  const themeSel =app.querySelector<HTMLSelectElement>("#theme")!;
  themeSel.value = savedTheme();
  themeSel.onchange = () => applyTheme(themeSel.value as Theme);
  return app.querySelector<HTMLElement>("#main")!;
}

function home(main: HTMLElement) {
  main.innerHTML = `
    <section class="hero">
      <h1>${t("home.title")}</h1>
      <p class="lead">${t("app.tagline")}</p>
    </section>
    <p class="lead">${t("home.lead")}</p>
    <ul class="module-list">
      ${modules.map(m => `
        <li><a class="module-card" href="#/m/${m.id}">
          <span class="tag">${t(`home.level.${m.level}` as "home.level.beginner")}</span>
          <strong>${t(m.titleKey)}</strong>
          <span>${t(m.descKey)}</span>
          <span class="go">${t("home.open")} →</span>
        </a></li>`).join("")}
      ${planned.map(m => `
        <li><div class="module-card soon" aria-disabled="true">
          <span class="tag">${t("home.soon")}</span>
          <strong>${t(m.titleKey)}</strong>
          <span>${t(m.descKey)}</span>
        </div></li>`).join("")}
    </ul>`;
  return () => {};
}

function route() {
  cleanup?.();
  cleanup = null;
  const main = shell();
  const m = location.hash.match(/^#\/m\/([\w-]+)(?:\/(\d+))?/);
  if (!m) {
    document.title = t("app.name");
    cleanup = home(main);
    return;
  }
  const mod = modules.find(x => x.id === m[1]);
  if (!mod) {
    main.innerHTML = `<h1>${t("notfound.title")}</h1><p><a href="#/">${t("nav.home")}</a></p>`;
    return;
  }
  const total = mod.pages.length;
  const idx = Math.min(Math.max((Number(m[2]) || 1) - 1, 0), total - 1);
  const page = mod.pages[idx];
  document.title = `${t(page.titleKey)} · ${t("app.name")}`;

  // 페이지 이동 바: 왼쪽 = 처음으로/이전으로, 오른쪽 = 다음으로
  const pageHash = (i: number) => (i === 0 ? `#/m/${mod.id}` : `#/m/${mod.id}/${i + 1}`);
  const pager = () => {
    const nav = document.createElement("nav");
    nav.className = "pager";
    nav.setAttribute("aria-label", t("nav.page", { n: idx + 1, total }));
    const prev = idx === 0
      ? `<a href="#/">← ${t("nav.home")}</a>`
      : `<a href="${pageHash(idx - 1)}">${t("nav.prev")}</a>`;
    const next = idx < total - 1
      ? `<a class="next" href="${pageHash(idx + 1)}">${t("nav.next")}</a>`
      : `<span></span>`;
    nav.innerHTML = `${prev}<span class="meta">${t("nav.page", { n: idx + 1, total })}</span>${next}`;
    return nav;
  };
  main.appendChild(pager());
  const body = document.createElement("div");
  main.appendChild(body);
  cleanup = page.mount(body);
  main.appendChild(pager());
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
