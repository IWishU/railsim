import { t, tk } from "../../i18n";
import { FREQS, SECTION_COUNT, evaluateInterference, assignment } from "./freq-engine";

const NS = "http://www.w3.org/2000/svg";
function el(tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.appendChild(e);
  return e;
}
const color = (i: number) => `hsl(${i * 45} 60% 42%)`;
const cssVar = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = (hz: number) => hz.toLocaleString("ko-KR");

export function mountFrequency(root: HTMLElement): () => void {
  let train = 1;
  let same = false;
  let pair = 0; // 0:A·B 1:C·D 2:E·F 3:G·H

  root.innerHTML = `
    <h1>${t("mod.af.p2.title")}</h1>
    <p class="lead">${t("mod.af.p2.lead")}</p>

    <h2>${t("mod.af.p2.cmp.title")}</h2>
    <section class="card table-wrap"><table>
      <thead><tr><th>${t("mod.af.p2.cmp.h0")}</th><th>${t("mod.af.p2.cmp.h1")}</th><th>${t("mod.af.p2.cmp.h2")}</th></tr></thead>
      <tbody>${[1, 2].map(n => `<tr><th scope="row">${tk(`mod.af.p2.cmp.r${n}`)}</th><td>${tk(`mod.af.p2.cmp.r${n}a`)}</td><td>${tk(`mod.af.p2.cmp.r${n}b`)}</td></tr>`).join("")}</tbody>
    </table></section>

    <h2>${t("mod.af.p2.table.title")}</h2>
    <section class="card">
      <div class="freq-chips">${FREQS.map((f, i) =>
        `<div class="chip" style="--c:${color(i)}"><b>${f.letter}</b><span>${fmt(f.hz)} Hz</span><small>${tk(`mod.af.p2.use.${f.letter}`)}</small></div>`).join("")}</div>
      <svg id="spectrum" viewBox="0 0 1000 120" role="img" aria-label="${t("mod.af.p2.spectrumLabel")}"></svg>
      <p class="meta">${t("mod.af.p2.table.note")}</p>
    </section>

    <h2>${t("mod.af.p2.lab.title")}</h2>
    <section class="card">
      <p class="meta lab-lead">${t("mod.af.p2.lab.lead")}</p>
      <svg id="lab" viewBox="0 0 1000 250" role="img" aria-label="${t("mod.af.p2.labLabel")}"></svg>
      <div class="controls">
        <span class="meta">${t("mod.af.p2.lineSel")}</span>
        <div class="seg" id="pair" role="group" aria-label="${t("mod.af.p2.lineSel")}">
          ${[0, 1, 2, 3].map(i => `<button class="btn" data-i="${i}" aria-pressed="false">${tk(`mod.af.p2.line.${i}`)}</button>`).join("")}
        </div>
      </div>
      <div class="controls">
        <span class="meta">${t("mod.af.p2.trainAt")}</span>
        <div class="seg" id="pos" role="group" aria-label="${t("mod.af.p2.trainAt")}">
          ${Array.from({ length: SECTION_COUNT }, (_, i) =>
            `<button class="btn" data-i="${i}" aria-pressed="false">${i + 1}T</button>`).join("")}
        </div>
        <button class="btn" id="mode" aria-pressed="false"></button>
      </div>
      <div class="status" id="status" aria-live="polite"></div>
      <div class="grid g6" id="cards"></div>
      <p class="meta gap">${t("mod.af.p2.lab.note")}</p>
    </section>

    <h2>${t("mod.af.p2.tune.title")}</h2>
    <section class="card"><ol>${[1, 2, 3, 4].map(n => `<li>${tk(`mod.af.p2.tune.${n}`)}</li>`).join("")}</ol></section>
    <h2>${t("mod.af.p2.why.title")}</h2>
    <section class="card"><ol>${[1, 2, 3, 4].map(n => `<li>${tk(`mod.af.p2.why.${n}`)}</li>`).join("")}</ol></section>
    <h2>${t("mod.af.p2.terms.title")}</h2>
    <section class="card"><dl>
      ${["nom", "res", "tu", "zone", "wrong"].map(k => `<dt>${tk(`mod.af.p2.term.${k}`)}</dt><dd>${tk(`mod.af.p2.term.${k}.d`)}</dd>`).join("")}
    </dl></section>
    <p class="meta src">${t("mod.af.source")}</p>`;

  const q = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const spectrum = q<SVGSVGElement>("#spectrum");
  const lab = q<SVGSVGElement>("#lab");
  const statusEl = q<HTMLElement>("#status");
  const modeBtn = q<HTMLButtonElement>("#mode");
  const cardsEl = q<HTMLElement>("#cards");
  const posBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("#pos button"));
  const pairBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("#pair button"));

  // 스펙트럼: 1,500~2,650Hz 축 위에 A~H
  const minHz = 1480, maxHz = 2660;
  const hx = (hz: number) => 40 + ((hz - minHz) / (maxHz - minHz)) * 920;
  const specBands: SVGRectElement[] = [];
  el("line", { x1: 30, y1: 90, x2: 970, y2: 90, stroke: "var(--rail)", "stroke-width": 2 }, spectrum);
  FREQS.forEach((f, i) => {
    specBands.push(el("rect", { x: hx(f.hz) - 12, y: 24, width: 24, height: 66, rx: 5, fill: color(i) }, spectrum) as SVGRectElement);
    el("text", { x: hx(f.hz), y: 16, "text-anchor": "middle", "font-size": 18, "font-weight": 700, fill: "currentColor" }, spectrum).textContent = f.letter;
    el("text", { x: hx(f.hz), y: 110, "text-anchor": "middle", "font-size": 14, fill: "currentColor", opacity: 0.75 }, spectrum).textContent = fmt(f.hz);
  });

  // 실험 트랙 (무절연: 레일은 이어져 있고, 경계에는 튜닝유니트 한 쌍만 있다)
  const SW = 150, X0 = 50, RT = 140, RB = 170;
  const secX = (i: number) => X0 + i * SW;
  const bgs: SVGElement[] = [];
  const labels: SVGElement[] = [];
  const leaks: SVGElement[] = [];
  for (let i = 0; i < SECTION_COUNT; i++) {
    bgs.push(el("rect", { x: secX(i) + 2, y: RT - 12, width: SW - 4, height: RB - RT + 24, rx: 6, opacity: 0.18 }, lab));
    el("text", { x: secX(i) + SW / 2, y: 232, "text-anchor": "middle", "font-size": 20, "font-weight": 600, fill: "currentColor" }, lab).textContent = `${i + 1}T`;
    labels.push(el("text", { x: secX(i) + SW / 2, y: 90, "text-anchor": "middle", "font-size": 38, "font-weight": 800, fill: "currentColor" }, lab));
  }
  [RT, RB].forEach(y => el("line", { x1: 20, y1: y, x2: 980, y2: y, stroke: "var(--rail)", "stroke-width": 5, "stroke-linecap": "round" }, lab));
  for (let i = 1; i < SECTION_COUNT; i++) { // 튜닝유니트 한 쌍(동조구간)
    el("rect", { x: secX(i) - 9, y: RB + 6, width: 8, height: 12, rx: 2, fill: "var(--warn)" }, lab);
    el("rect", { x: secX(i) + 1, y: RB + 6, width: 8, height: 12, rx: 2, fill: "var(--warn)" }, lab);
  }
  const trainG = el("g", {}, lab);
  el("rect", { x: 0, y: RT - 24, width: SW - 30, height: 32, rx: 9, fill: "var(--accent)" }, trainG);
  [18, 48, SW - 78, SW - 48].forEach(cx => el("circle", { cx, cy: RT + 12, r: 6, fill: "currentColor" }, trainG));
  // 이웃 구간에서 새어 들어오는 신호 화살표 (구간 i의 왼쪽/오른쪽 경계)
  for (let i = 0; i < SECTION_COUNT; i++)
    for (const side of [-1, 1] as const) {
      const bx = side === -1 ? secX(i) : secX(i) + SW;
      const g = el("g", { visibility: "hidden" }, lab);
      g.dataset.sec = String(i);
      if (bx > secX(0) && bx < secX(SECTION_COUNT)) {
        const d = -side; // 진행 방향: 이웃(밖) → 이 구간(안)
        const from = bx - d * 26, to = bx + d * 26;
        el("path", { d: `M ${from} 112 Q ${bx} 74 ${to} 112`, fill: "none", stroke: "var(--occ)", "stroke-width": 3, "stroke-dasharray": "6 4" }, g);
        el("path", { d: `M ${to - d * 10} 101 L ${to} 112 L ${to - d * 12} 118`, fill: "none", stroke: "var(--occ)", "stroke-width": 3 }, g);
      }
      leaks.push(g);
    }

  const cards = Array.from({ length: SECTION_COUNT }, (_, i) => {
    const c = document.createElement("div");
    c.className = "card sec";
    c.innerHTML = `<h3>${i + 1}T <span class="badge"></span></h3><div class="meta fr"></div>
      <div class="bar"><i></i></div><div class="meta lvl"></div>`;
    cardsEl.appendChild(c);
    return {
      badge: c.querySelector<HTMLElement>(".badge")!, fr: c.querySelector<HTMLElement>(".fr")!,
      bar: c.querySelector<HTMLElement>(".bar")!, fill: c.querySelector<HTMLElement>(".bar > i")!,
      lvl: c.querySelector<HTMLElement>(".lvl")!,
    };
  });

  function render() {
    const asg = assignment(pair, same);
    const res = evaluateInterference(asg, train);
    const [free, occ] = [cssVar("--free"), cssVar("--occ")];
    res.forEach((r, i) => {
      const f = FREQS[asg[i]];
      bgs[i].setAttribute("fill", r.detectedOccupied ? occ : free);
      labels[i].textContent = f.letter;
      labels[i].setAttribute("fill", color(asg[i]));
      const c = cards[i];
      c.badge.textContent = r.detectedOccupied ? t("mod.af.occupied") : t("mod.af.free");
      c.badge.classList.toggle("occ", r.detectedOccupied);
      c.fr.textContent = t("mod.af.freq", { t: f.letter, hz: fmt(f.hz) });
      c.bar.classList.toggle("low", !r.relayUp);
      c.fill.style.width = r.level + "%";
      c.lvl.textContent = t("mod.af.level", { pct: r.level }) + (r.leakPct ? ` (${t("mod.af.p2.leakIn", { pct: r.leakPct })})` : "");
    });
    trainG.setAttribute("transform", `translate(${secX(train) + 6},0)`);
    leaks.forEach(g => {
      const show = g.dataset.sec !== undefined && +g.dataset.sec === train && res[train].leakPct > 0;
      g.setAttribute("visibility", show ? "visible" : "hidden");
    });
    posBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === train)));
    pairBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === pair)));
    modeBtn.setAttribute("aria-pressed", String(same));
    const [a, b] = [FREQS[pair * 2].letter, FREQS[pair * 2 + 1].letter];
    modeBtn.textContent = same ? t("mod.af.p2.modeSame", { a }) : t("mod.af.p2.modeDiff", { a, b });
    specBands.forEach((band, i) => band.setAttribute("opacity", asg.includes(i) ? "1" : "0.25"));

    const dangerous = !res[train].detectedOccupied;
    statusEl.className = "status" + (dangerous ? " danger" : "");
    statusEl.textContent = dangerous
      ? t("mod.af.p2.danger", { s: `${train + 1}T` })
      : same ? t("mod.af.p2.sameSafe") : t("mod.af.p2.diffOk", { s: `${train + 1}T`, f: FREQS[asg[train]].letter });
  }

  posBtns.forEach((b, i) => { b.onclick = () => { train = i; render(); }; });
  pairBtns.forEach((b, i) => { b.onclick = () => { pair = i; render(); }; });
  modeBtn.onclick = () => { same = !same; render(); };
  const mq = matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", render);
  const obs = new MutationObserver(render);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  render();
  return () => { mq.removeEventListener("change", render); obs.disconnect(); };
}
