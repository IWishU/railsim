import { t, tk } from "../../i18n";
import { AfTrackCircuit, SECTIONS } from "./engine";

const NS = "http://www.w3.org/2000/svg";
const RAIL_T = 150, RAIL_B = 180;

function el<K extends keyof SVGElementTagNameMap>(
  tag: K, attrs: Record<string, string | number>, parent?: Element,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.appendChild(e);
  return e;
}

export function mountBasics(root: HTMLElement): () => void {
  {
    const sim = new AfTrackCircuit();
    const W = sim.sectionWidth;
    let running = false, last = 0, speed = 1, raf = 0;
    const slow = matchMedia("(prefers-reduced-motion: reduce)").matches;

    root.innerHTML = `
      <h1>${t("mod.af.p1.title")}</h1>
      <p class="lead">${t("mod.af.lead")}</p>
      <section class="card">
        <svg id="track" viewBox="0 0 1000 250" role="img" aria-label="${t("mod.af.svgLabel")}"></svg>
        <div class="controls">
          <button class="btn primary" id="play"></button>
          <button class="btn" id="reset">${t("mod.af.reset")}</button>
          <button class="btn" id="fault" aria-pressed="false">${t("mod.af.fault", { section: SECTIONS[1].name })}</button>
          <label class="speed">${t("mod.af.speed")}
            <input id="speed" type="range" min="0.5" max="3" step="0.5" value="1">
          </label>
        </div>
        <div class="status" id="status" aria-live="polite"></div>
        <div class="grid" id="cards"></div>
      </section>
      <h2>${t("mod.af.how.title")}</h2>
      <section class="card"><ol>${[1, 2, 3, 4, 5].map(n => `<li>${t(`mod.af.how.${n}` as "mod.af.how.1")}</li>`).join("")}</ol></section>
      <h2>${t("mod.af.shunt.title")}</h2>
      <section class="card"><p>${t("mod.af.shunt.body")}</p></section>
      <h2>${t("mod.af.cmp.title")}</h2>
      <section class="card table-wrap"><table>
        <thead><tr><th>${t("mod.af.cmp.h0")}</th><th>${t("mod.af.cmp.h1")}</th><th>${t("mod.af.cmp.h2")}</th></tr></thead>
        <tbody>${[1, 2, 3, 4, 5].map(n => `<tr><th scope="row">${tk(`mod.af.cmp.r${n}`)}</th><td>${tk(`mod.af.cmp.r${n}a`)}</td><td>${tk(`mod.af.cmp.r${n}b`)}</td></tr>`).join("")}</tbody>
      </table></section>
      <h2>${t("mod.af.failsafe.title")}</h2>
      <section class="card"><p>${t("mod.af.failsafe.body")}</p><p class="gap">${t("mod.af.failsafe.note")}</p></section>
      <blockquote class="sum">${t("mod.af.p1.sum")}</blockquote>
      <h2>${t("mod.af.terms.title")}</h2>
      <section class="card"><dl>
        ${(["af", "tc", "occ", "shunt", "relay", "closed", "failsafe"] as const).map(k =>
          `<dt>${tk(`mod.af.term.${k}`)}</dt><dd>${tk(`mod.af.term.${k}.d`)}</dd>`).join("")}
      </dl></section>
      <p class="meta src">${t("mod.af.source")}</p>`;

    const svg = root.querySelector<SVGSVGElement>("#track")!;
    const playBtn = root.querySelector<HTMLButtonElement>("#play")!;
    const faultBtn = root.querySelector<HTMLButtonElement>("#fault")!;
    const statusEl = root.querySelector<HTMLElement>("#status")!;
    const cardsEl = root.querySelector<HTMLElement>("#cards")!;

    // --- 정적 요소 ---
    const secBg: SVGRectElement[] = [];
    const lampTop: SVGCircleElement[] = [];
    const lampBot: SVGCircleElement[] = [];
    SECTIONS.forEach((s, i) => {
      const x = sim.originX + i * W;
      secBg.push(el("rect", { x: x + 2, y: RAIL_T - 12, width: W - 4, height: RAIL_B - RAIL_T + 24, rx: 6, opacity: 0.16 }, svg));
      const label = el("text", { x: x + W / 2, y: 232, "text-anchor": "middle", "font-size": 22, "font-weight": 600, fill: "currentColor" }, svg);
      label.textContent = s.name;
    });
    [RAIL_T, RAIL_B].forEach(y =>
      el("line", { x1: 0, y1: y, x2: 1000, y2: y, "stroke-width": 5, "stroke-linecap": "round", stroke: "var(--rail)" }, svg));
    SECTIONS.forEach((_, i) => {
      const x = sim.originX + i * W;
      el("text", { x: x + 12, y: RAIL_T - 20, "font-size": 17, fill: "currentColor", opacity: 0.7 }, svg).textContent = "RX";
      el("text", { x: x + W - 12, y: RAIL_T - 20, "font-size": 17, "text-anchor": "end", fill: "currentColor", opacity: 0.7 }, svg).textContent = "TX";
      const sx = x + 6;
      el("line", { x1: sx, y1: RAIL_T - 30, x2: sx, y2: 40, stroke: "currentColor", "stroke-width": 3, opacity: 0.5 }, svg);
      el("rect", { x: sx - 14, y: 10, width: 28, height: 52, rx: 8, fill: "#222" }, svg);
      lampTop.push(el("circle", { cx: sx, cy: 24, r: 8 }, svg));
      lampBot.push(el("circle", { cx: sx, cy: 48, r: 8 }, svg));
    });
    const train = el("g", {}, svg);
    el("rect", { x: 0, y: RAIL_T - 26, width: sim.trainLength, height: 34, rx: 10, fill: "var(--accent)" }, train);
    [20, 50, sim.trainLength - 50, sim.trainLength - 20].forEach(cx => {
      el("circle", { cx, cy: RAIL_T + 12, r: 7, fill: "currentColor" }, train);
      el("line", { x1: cx, y1: RAIL_T, x2: cx, y2: RAIL_B, stroke: "var(--warn)", "stroke-width": 3, "stroke-dasharray": "4 3" }, train);
    });
    const crack = el("text", { x: sim.originX + W * 1.5, y: RAIL_T + 6, "text-anchor": "middle", "font-size": 26, fill: "var(--occ)", visibility: "hidden" }, svg);
    crack.textContent = "✕";

    const cards = SECTIONS.map(s => {
      const c = document.createElement("div");
      c.className = "card sec";
      c.innerHTML = `<h3>${s.name} <span class="badge"></span></h3>
        <div class="meta">${t("mod.af.freq", { t: s.letter, hz: s.freq.toLocaleString("ko-KR") })}</div>
        <div class="bar"><i></i></div><div class="meta lvl"></div>`;
      cardsEl.appendChild(c);
      return {
        badge: c.querySelector<HTMLElement>(".badge")!,
        bar: c.querySelector<HTMLElement>(".bar")!,
        fill: c.querySelector<HTMLElement>(".bar > i")!,
        lvl: c.querySelector<HTMLElement>(".lvl")!,
      };
    });

    const cssVar = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

    function render() {
      const states = sim.evaluate();
      const [free, occ, warn] = [cssVar("--free"), cssVar("--occ"), cssVar("--warn")];
      states.forEach((s, i) => {
        secBg[i].setAttribute("fill", s.occupied ? occ : free);
        lampTop[i].setAttribute("fill", s.aspect === "stop" ? occ : s.aspect === "caution" ? warn : "#3a3a3a");
        lampBot[i].setAttribute("fill", s.aspect === "clear" ? free : "#3a3a3a");
        const c = cards[i];
        c.badge.textContent = s.occupied ? t("mod.af.occupied") : t("mod.af.free");
        c.badge.classList.toggle("occ", s.occupied);
        c.bar.classList.toggle("low", !s.relayUp);
        c.fill.style.width = s.level + "%";
        c.lvl.textContent = `${t("mod.af.level", { pct: s.level })} · ${s.relayUp ? t("mod.af.relayUp") : t("mod.af.relayDown")}`;
      });
      train.setAttribute("transform", `translate(${sim.trainX},0)`);
      crack.setAttribute("visibility", sim.faultIndex !== null ? "visible" : "hidden");

      const byTrain = SECTIONS.filter((_, i) => states[i].cause === "train").map(s => s.name);
      const parts: string[] = [];
      if (byTrain.length) parts.push(t("mod.af.trainIn", { sections: byTrain.join(", ") }));
      if (sim.faultIndex !== null) parts.push(t("mod.af.faultIn", { section: SECTIONS[sim.faultIndex].name }));
      statusEl.textContent = parts.length ? parts.join(" ") : (running || sim.trainX > sim.startX ? t("mod.af.allFree") : t("mod.af.hint"));
    }

    function frame(now: number) {
      if (!running) return;
      const dt = last ? Math.min(now - last, 50) : 16;
      last = now;
      sim.step(dt, speed, slow);
      render();
      raf = requestAnimationFrame(frame);
    }
    function setRunning(v: boolean) {
      running = v; last = 0;
      playBtn.textContent = v ? t("mod.af.pause") : t("mod.af.play");
      cancelAnimationFrame(raf);
      if (v) raf = requestAnimationFrame(frame);
    }

    playBtn.onclick = () => setRunning(!running);
    root.querySelector<HTMLButtonElement>("#reset")!.onclick = () => { sim.reset(); setRunning(false); render(); };
    faultBtn.onclick = () => {
      sim.faultIndex = sim.faultIndex === null ? 1 : null;
      faultBtn.setAttribute("aria-pressed", String(sim.faultIndex !== null));
      render();
    };
    root.querySelector<HTMLInputElement>("#speed")!.oninput = e => { speed = +(e.target as HTMLInputElement).value; };

    const onVis = () => { if (document.hidden) setRunning(false); };
    document.addEventListener("visibilitychange", onVis);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", render);
    const themeObs = new MutationObserver(render);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    setRunning(false);
    render();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      mq.removeEventListener("change", render);
      themeObs.disconnect();
    };
  }
}
