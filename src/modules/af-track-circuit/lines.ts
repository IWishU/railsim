// @ts-nocheck
/* 3페이지: 상선·하선 주파수 배치
   외부에서 만든 시뮬레이션 코드를 사이트 페이지로 옮긴 파일입니다.
   원본 동작을 그대로 두려고 타입 점검은 끄고(ts-nocheck), mount/cleanup만 사이트 규격에 맞췄습니다. */
import __html from "./views/lines.html?raw";

export function mountLines(root: HTMLElement): () => void {
  root.innerHTML = `<div class="af">${__html}</div>`;
  const $ = (id: string) => root.querySelector("#" + id) as any;
  let __off = () => {};
  const NS = "http://www.w3.org/2000/svg";
  const mk = (p, tag, a, text) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; p.appendChild(e); return e; };
  const T = (p, t, a) => mk(p, "text", { fill: "currentColor", ...a }, t);
  const FREQ = { A: 1699, B: 2296, C: 1996, D: 2593, E: 1549, F: 2146, G: 1848, H: 2445 };
  const LINES = [
    { name: "하선", dir: 1, pair: ["A", "B"], lens: [720, 940, 610, 860, 780] },
    { name: "상선", dir: -1, pair: ["C", "D"], lens: [880, 650, 990, 700, 830] },
    { name: "복복선 하선", dir: 1, pair: ["E", "F"], lens: [640, 820, 900, 760, 690], quad: true },
    { name: "복복선 상선", dir: -1, pair: ["G", "H"], lens: [930, 700, 760, 880, 620], quad: true }
  ];
  const svg = $("lineSvg");
  const X0 = 150, X1 = 985, ZW = 14, ROW = 108, TOP = 30;
  let lay = 2, waves = true, selected = null;

  const wavePath = (x1, x2, yc, freq) => {
    const lam = 30 - (freq - 1549) / (2593 - 1549) * 14; // 높은 주파수 = 촘촘
    const amp = 4.5; let d = `M${x1.toFixed(1)} ${yc}`;
    for (let x = x1; x <= x2; x += 2) d += ` L${x.toFixed(1)} ${(yc + amp * Math.sin((x - x1) / lam * 2 * Math.PI)).toFixed(1)}`;
    return d;
  };
  const durOf = f => (1.5 - (f - 1549) / (2593 - 1549) * 0.8).toFixed(2) + "s";

  function draw() {
    svg.innerHTML = "";
    const lines = LINES.filter(l => lay === 4 || !l.quad);
    const H = TOP + lines.length * ROW + 10;
    svg.setAttribute("viewBox", `0 0 1000 ${H}`);
    const defs = mk(svg, "defs", {});
    const pat = mk(defs, "pattern", { id: "zoneHatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    mk(pat, "rect", { width: 3, height: 6, fill: "var(--zone)", opacity: .55 });
    const segs = [];
    lines.forEach((L, r) => {
      const yT = TOP + r * ROW + 36, yB = yT + 26, yc = (yT + yB) / 2;
      // 왼쪽 라벨
      T(svg, L.name, { x: 8, y: yT + 4, "font-size": 15, "font-weight": 700 });
      T(svg, L.dir > 0 ? "열차 →" : "← 열차", { x: 8, y: yT + 24, class: "sm", opacity: .7 });
      T(svg, L.pair.join(" · "), { x: 8, y: yT + 42, class: "sm", "font-weight": 700, fill: `var(--f${L.pair[0]})` });
      const total = L.lens.reduce((a, b) => a + b, 0);
      const pxPerM = (X1 - X0 - ZW * (L.lens.length - 1)) / total;
      let x = X0;
      L.lens.forEach((m, i) => {
        const t = L.pair[i % 2], f = FREQ[t], w = m * pxPerM, col = `var(--f${t})`;
        const g = mk(svg, "g", { class: "seghit", tabindex: 0, role: "button", "aria-label": `${L.name} ${i + 1}구간 ${t}형 ${f}Hz ${m}m` });
        mk(g, "rect", { class: "band", x: x, y: yT - 4, width: w, height: yB - yT + 8, rx: 4, fill: col, "fill-opacity": .13 });
        if (waves) {
          const wv = mk(g, "path", { class: "wave" + (L.dir > 0 ? " rev" : ""), d: wavePath(x + 6, x + w - 6, yc, f), stroke: col });
          wv.style.setProperty("--dur", durOf(f));
        } else {
          mk(g, "path", { d: wavePath(x + 6, x + w - 6, yc, f), stroke: col, fill: "none", "stroke-width": 2, opacity: .5 });
        }
        T(g, `${t} ${f.toLocaleString()}Hz`, { x: x + w / 2, y: yT - 12, "text-anchor": "middle", class: "sm", "font-weight": 700, fill: col });
        T(g, `${m.toLocaleString()}m`, { x: x + w / 2, y: yB + 22, "text-anchor": "middle", class: "sm", opacity: .75 });
        const seg = { L, i, t, f, m, g, prev: i > 0 ? L.pair[(i - 1) % 2] : null, next: i < L.lens.length - 1 ? L.pair[(i + 1) % 2] : null, last: L.lens.length };
        g.addEventListener("click", () => select(seg));
        g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(seg); } });
        segs.push(seg);
        x += w;
        if (i < L.lens.length - 1) {
          mk(svg, "rect", { x: x, y: yT - 2, width: ZW, height: yB - yT + 4, fill: "url(#zoneHatch)" });
          // 튜닝유니트 (동조구간 양쪽)
          [x - 3, x + ZW + 3].forEach(tx => {
            mk(svg, "rect", { x: tx - 4, y: yT - 18, width: 8, height: 12, rx: 2, fill: "var(--card)", stroke: "currentColor", "stroke-width": 1.2 });
            mk(svg, "line", { x1: tx, y1: yT - 6, x2: tx, y2: yT - 1, stroke: "currentColor", "stroke-width": 1.2 });
          });
          x += ZW;
        }
      });
      // 레일 (위에 그려서 선명하게)
      mk(svg, "line", { x1: X0, y1: yT, x2: X1, y2: yT, stroke: "var(--rail)", "stroke-width": 4, "stroke-linecap": "round" });
      mk(svg, "line", { x1: X0, y1: yB, x2: X1, y2: yB, stroke: "var(--rail)", "stroke-width": 4, "stroke-linecap": "round" });
      // 종단형 튜닝유니트
      [X0, X1].forEach(tx => {
        mk(svg, "rect", { x: tx - 5, y: yT - 18, width: 10, height: 12, rx: 2, fill: "var(--card)", stroke: "var(--zone)", "stroke-width": 1.6 });
      });
    });
    // 범례
    const ly = TOP - 14;
    mk(svg, "rect", { x: X0, y: ly - 9, width: 8, height: 12, rx: 2, fill: "var(--card)", stroke: "currentColor", "stroke-width": 1.2 });
    T(svg, "튜닝유니트", { x: X0 + 14, y: ly + 1, class: "sm", opacity: .8 });
    mk(svg, "rect", { x: X0 + 100, y: ly - 9, width: 10, height: 12, rx: 2, fill: "var(--card)", stroke: "var(--zone)", "stroke-width": 1.6 });
    T(svg, "종단형", { x: X0 + 116, y: ly + 1, class: "sm", opacity: .8 });
    mk(svg, "rect", { x: X0 + 180, y: ly - 9, width: 14, height: 12, fill: "url(#zoneHatch)" });
    T(svg, "동조구간 20m (확대 표시)", { x: X0 + 200, y: ly + 1, class: "sm", opacity: .8 });
    // 칩
    const used = new Set(lines.flatMap(l => l.pair));
    $("chips").innerHTML = Object.keys(FREQ).map(k => `<span class="chip${used.has(k) ? "" : " off"}"><i style="background:var(--f${k})"></i>${k} ${FREQ[k].toLocaleString()}Hz</span>`).join("");
    const keep = selected && segs.find(z => z.L === selected.L && z.i === selected.i);
    select(keep || segs[1]);
  }

  function select(seg) {
    selected = seg;
    svg.querySelectorAll(".seghit").forEach(g => g.classList.toggle("sel", g === seg.g));
    const nb = [...new Set([seg.prev, seg.next].filter(Boolean))].map(t => `${t}형 ${FREQ[t].toLocaleString()}Hz`).join(", ");
    const tuTypes = (seg.i === 0 ? "종단형" : "일반형") + " · " + (seg.i === seg.last - 1 ? "종단형" : "일반형");
    $("info").innerHTML = `
      <div><small>선택한 구간</small><b>${seg.L.name} ${seg.i + 1}구간</b></div>
      <div><small>공칭주파수</small><b style="color:var(--f${seg.t})">${seg.t}형 ${seg.f.toLocaleString()} Hz</b></div>
      <div><small>구간 길이 (예시)</small><b>${seg.m.toLocaleString()} m</b></div>
      <div><small>양 끝 튜닝유니트</small><b>${tuTypes}</b></div>
      <div style="grid-column:1/-1"><small>이웃 구간</small>${nb ? `${nb} — 이웃과 주파수가 달라서 섞이지 않습니다.` : "없음"} ${seg.i > 0 || seg.i < seg.last - 1 ? "맞닿는 곳마다 20m 동조구간에서 갈립니다." : ""}</div>`;
  }

  root.querySelectorAll(".lay").forEach(b => b.addEventListener("click", () => {
    lay = +b.dataset.lay;
    root.querySelectorAll(".lay").forEach(x => x.setAttribute("aria-pressed", x === b));
    draw();
  }));
  const wb = $("waveBtn");
  wb.addEventListener("click", () => {
    waves = !waves; wb.setAttribute("aria-pressed", waves);
    wb.textContent = waves ? "〰 주파수 흐름 켜짐" : "〰 주파수 흐름 꺼짐";
    draw();
  });
  draw();

  /* ---------- 동조구간 확대 (공진) ---------- */
  const z = $("zoomSvg");
  const zx1 = 380, zx2 = 620, yT = 178, yB = 212, yc = 195;
  const zd = mk(z, "defs", {});
  const glowG = mk(zd, "linearGradient", { id: "wallG", x1: 0, x2: 1, y1: 0, y2: 0 });
  mk(glowG, "stop", { offset: "0", "stop-color": "var(--zone)", "stop-opacity": 0 });
  mk(glowG, "stop", { offset: "0.5", "stop-color": "var(--zone)", "stop-opacity": .55 });
  mk(glowG, "stop", { offset: "1", "stop-color": "var(--zone)", "stop-opacity": 0 });

  // 진폭이 위치에 따라 줄어드는 물결
  const envWave = (xa, xb, y, freq, env) => {
    const lam = 30 - (freq - 1549) / (2593 - 1549) * 14, amp = 6;
    let d = "";
    for (let x = xa; x <= xb; x += 2) {
      const yy = y + amp * env(x) * Math.sin((x - xa) / lam * 2 * Math.PI);
      d += (d ? " L" : "M") + x.toFixed(1) + " " + yy.toFixed(2);
    }
    return d;
  };
  const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const envA = x => x <= zx1 ? 1 : x <= zx2 ? 1 - .93 * smooth((x - zx1) / (zx2 - zx1)) : .07 * Math.exp(-(x - zx2) / 14);
  const envB = x => x >= zx2 ? 1 : x >= zx1 ? 1 - .93 * smooth((zx2 - x) / (zx2 - zx1)) : .07 * Math.exp(-(zx1 - x) / 14);

  // 동조구간 바탕
  mk(z, "rect", { x: zx1, y: yT - 8, width: zx2 - zx1, height: yB - yT + 16, rx: 4, fill: "var(--zone)", opacity: .1 });
  // 물결 (A: 왼쪽 구간, B: 오른쪽 구간)
  const wA = mk(z, "path", { class: "wave", d: envWave(30, zx2 + 70, yc - 6, FREQ.A, envA), stroke: "var(--fA)" });
  wA.style.setProperty("--dur", durOf(FREQ.A));
  const wB = mk(z, "path", { class: "wave rev", d: envWave(zx1 - 70, 970, yc + 6, FREQ.B, envB), stroke: "var(--fB)" });
  wB.style.setProperty("--dur", durOf(FREQ.B));
  // 레일
  mk(z, "line", { x1: 24, y1: yT, x2: 976, y2: yT, stroke: "var(--rail)", "stroke-width": 5, "stroke-linecap": "round" });
  mk(z, "line", { x1: 24, y1: yB, x2: 976, y2: yB, stroke: "var(--rail)", "stroke-width": 5, "stroke-linecap": "round" });

  // 차단 지점: 빛나는 벽 + 퍼지는 파동
  const block = (x, col, label, anchor, lx) => {
    mk(z, "rect", { class: "glow", x: x - 10, y: yT - 14, width: 20, height: yB - yT + 28, fill: "url(#wallG)" });
    mk(z, "circle", { class: "ring", cx: x, cy: yc, r: 16, fill: "none", stroke: col, "stroke-width": 2.5 });
    mk(z, "circle", { class: "ring d2", cx: x, cy: yc, r: 16, fill: "none", stroke: col, "stroke-width": 2.5 });
    T(z, label, { x: lx, y: yB + 30, "text-anchor": anchor, class: "sm", "font-weight": 700, fill: col });
  };
  block(zx2, "var(--fA)", "A는 여기서 막힘", "start", zx2 + 12);
  block(zx1, "var(--fB)", "B는 여기서 막힘", "end", zx1 - 12);

  // 튜닝유니트 + 공진 곡선
  const FMIN = 1450, FMAX = 2700;
  const tu = (cx, own, other) => {
    const w = 190, x0 = cx - w / 2, gy = 20, gh = 62;
    mk(z, "rect", { x: x0, y: gy - 12, width: w, height: gh + 30, rx: 8, fill: "var(--card)", stroke: "currentColor", "stroke-opacity": .25 });
    const fx = f => x0 + 12 + (f - FMIN) / (FMAX - FMIN) * (w - 24);
    const base = gy + gh, Q = 70;
    let d = "";
    for (let f = FMIN; f <= FMAX; f += 10) {
      const r = 1 / (1 + Math.pow((f - FREQ[own]) / Q, 2));
      d += (d ? " L" : "M") + fx(f).toFixed(1) + " " + (base - 4 - r * (gh - 16)).toFixed(1);
    }
    mk(z, "path", { d: d + ` L${fx(FMAX)} ${base - 4} L${fx(FMIN)} ${base - 4} Z`, fill: `var(--f${own})`, opacity: .15 });
    mk(z, "path", { d, fill: "none", stroke: `var(--f${own})`, "stroke-width": 2.4 });
    mk(z, "line", { x1: x0 + 10, y1: base - 4, x2: x0 + w - 10, y2: base - 4, stroke: "currentColor", opacity: .35 });
    const ro = 1 / (1 + Math.pow((FREQ[other] - FREQ[own]) / Q, 2));
    mk(z, "circle", { cx: fx(FREQ[own]), cy: base - 4 - (gh - 16), r: 4, fill: `var(--f${own})` });
    mk(z, "circle", { cx: fx(FREQ[other]), cy: base - 4 - ro * (gh - 16), r: 4, fill: `var(--f${other})` });
    T(z, `공진: ${own} ${FREQ[own].toLocaleString()}Hz`, { x: x0 + 10, y: gy + 4, class: "sm", "font-weight": 700, fill: `var(--f${own})` });
    T(z, `${other}에는 거의 반응 없음`, { x: x0 + w - 10, y: base + 12, "text-anchor": "end", "font-size": 11, opacity: .75 });
    mk(z, "rect", { x: cx - 46, y: 118, width: 92, height: 28, rx: 7, fill: "var(--card)", stroke: `var(--f${own})`, "stroke-width": 2 });
    T(z, "튜닝유니트", { x: cx, y: 137, "text-anchor": "middle", class: "sm", "font-weight": 700 });
    mk(z, "line", { x1: cx - 8, y1: 146, x2: cx - 8, y2: yT - 2, stroke: "currentColor", "stroke-width": 1.6 });
    mk(z, "line", { x1: cx + 8, y1: 146, x2: cx + 8, y2: yB - 2, stroke: "currentColor", "stroke-width": 1.6 });
  };
  tu(zx1, "A", "B");
  tu(zx2, "B", "A");

  // 치수와 구간 이름
  const dm = mk(zd, "marker", { id: "zar", viewBox: "0 0 10 10", refX: 5, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
  mk(dm, "path", { d: "M0 0L10 5L0 10z", fill: "var(--zone)" });
  mk(z, "line", { x1: zx1 + 4, y1: 278, x2: zx2 - 4, y2: 278, stroke: "var(--zone)", "stroke-width": 1.6, "marker-start": "url(#zar)", "marker-end": "url(#zar)" });
  T(z, "동조구간 20m (±0.5m)", { x: 500, y: 300, "text-anchor": "middle", class: "lbl", fill: "var(--zone)" });
  T(z, "A 1,699Hz 구간", { x: 150, y: 160, "text-anchor": "middle", class: "lbl", fill: "var(--fA)" });
  T(z, "B 2,296Hz 구간", { x: 850, y: 160, "text-anchor": "middle", class: "lbl", fill: "var(--fB)" });
  return () => __off();
}
