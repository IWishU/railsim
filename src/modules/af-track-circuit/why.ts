// @ts-nocheck
/* 2페이지: 중계궤도는 왜 쓰나요?
   외부에서 만든 시뮬레이션 코드를 사이트 페이지로 옮긴 파일입니다.
   원본 동작을 그대로 두려고 타입 점검은 끄고(ts-nocheck), mount/cleanup만 사이트 규격에 맞췄습니다. */
import __html from "./views/why.html?raw";

export function mountWhy(root: HTMLElement): () => void {
  root.innerHTML = `<div class="af">${__html}</div>`;
  const $ = (id: string) => root.querySelector("#" + id) as any;
  let __off = () => {};
  const NS = "http://www.w3.org/2000/svg";
  const mk = (parent, tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    parent.appendChild(e); return e;
  };
  const T = (p, t, a) => mk(p, "text", { fill: "currentColor", ...a }, t);


  /* ---------- 1. 길이 한계 ---------- */
  const len = $("lenSvg");
  const X0 = 60, X1 = 940, PX = (X1 - X0) / 2000, GY0 = 210, GH = 100;
  const LAMBDA = { good: 950, mid: 750, bad: 500 }, TH = 30;
  let ballast = "good";
  // 고정 요소
  [0, 500, 1000, 1500, 2000].forEach(m => {
    mk(len, "line", { x1: X0 + m * PX, y1: GY0, x2: X0 + m * PX, y2: GY0 + 6, stroke: "currentColor", opacity: .5 });
    T(len, `${m.toLocaleString()}m`, { x: X0 + m * PX, y: GY0 + 22, "text-anchor": "middle", class: "sm", opacity: .7 });
  });
  mk(len, "line", { x1: X0, y1: GY0, x2: X1, y2: GY0, stroke: "currentColor", opacity: .4 });
  mk(len, "line", { x1: X0 + 1000 * PX, y1: 24, x2: X0 + 1000 * PX, y2: GY0, stroke: "var(--muted)", "stroke-dasharray": "3 5" });
  T(len, "AF 한 구간 보통 ≈1,000m", { x: X0 + 1000 * PX + 8, y: 36, class: "sm", fill: "var(--muted)" });
  const thY = GY0 - TH / 100 * GH;
  mk(len, "line", { x1: X0, y1: thY, x2: X1, y2: thY, stroke: "var(--occ)", "stroke-dasharray": "6 5", "stroke-width": 1.5 });
  T(len, "수신 최소선 (이보다 약하면 판단이 흔들림)", { x: X1, y: thY - 6, "text-anchor": "end", class: "sm", fill: "var(--occ)" });
  T(len, "TX", { x: X0, y: 30, "text-anchor": "middle", class: "sm", "font-weight": 700 });
  const railT = mk(len, "line", { x1: X0, y1: 52, x2: X0, y2: 52, stroke: "var(--rail)", "stroke-width": 5, "stroke-linecap": "round" });
  const railB = mk(len, "line", { x1: X0, y1: 70, x2: X0, y2: 70, stroke: "var(--rail)", "stroke-width": 5, "stroke-linecap": "round" });
  const rxT = T(len, "RX", { y: 30, "text-anchor": "middle", class: "sm", "font-weight": 700 });
  const area = mk(len, "path", { fill: "var(--flow)", opacity: .12 });
  const curve = mk(len, "path", { fill: "none", stroke: "var(--flow)", "stroke-width": 3 });
  const dot = mk(len, "circle", { r: 7 });
  const dotT = T(len, "", { class: "sm", "font-weight": 700 });
  T(len, "수신 세기", { x: 10, y: GY0 - GH - 6, class: "sm", opacity: .7 });

  function drawLen() {
    const L = +$("lenR").value, lam = LAMBDA[ballast];
    $("lenV").textContent = `${L.toLocaleString()} m`;
    const xe = X0 + L * PX;
    railT.setAttribute("x2", xe); railB.setAttribute("x2", xe); rxT.setAttribute("x", xe);
    const pts = [];
    for (let d = 0; d <= L; d += 25) pts.push([X0 + d * PX, GY0 - 100 * Math.exp(-d / lam) / 100 * GH]);
    const lvl = 100 * Math.exp(-L / lam);
    pts.push([xe, GY0 - lvl / 100 * GH]);
    const dpath = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    curve.setAttribute("d", dpath);
    area.setAttribute("d", dpath + ` L${xe} ${GY0} L${X0} ${GY0} Z`);
    const ok = lvl >= TH, ye = GY0 - lvl / 100 * GH;
    dot.setAttribute("cx", xe); dot.setAttribute("cy", ye); dot.setAttribute("fill", ok ? "var(--free)" : "var(--occ)");
    dotT.textContent = `수신 ${Math.round(lvl)}%`;
    const right = xe > 820;
    dotT.setAttribute("x", right ? xe - 12 : xe + 12); dotT.setAttribute("y", ye - 10);
    dotT.setAttribute("text-anchor", right ? "end" : "start");
    dotT.setAttribute("fill", ok ? "var(--free)" : "var(--occ)");
    const st = $("lenStatus");
    st.className = "status " + (ok ? "ok" : "bad");
    st.innerHTML = ok
      ? `<b style="color:var(--free)">수신 충분</b> — 이 길이면 궤도회로 하나로 열차 유무를 믿을 수 있습니다.`
      : `<b style="color:var(--occ)">수신 부족</b> — 열차가 없는데도 점유로 나오는 오판이 생기고, 감도를 올려 버티면 반대로 열차를 놓칠 위험이 커집니다. <b>둘로 나눠야 합니다.</b>`;
  }
  $("lenR").addEventListener("input", drawLen);
  root.querySelectorAll(".ballast").forEach(b => b.addEventListener("click", () => {
    ballast = b.dataset.b;
    root.querySelectorAll(".ballast").forEach(x => x.setAttribute("aria-pressed", x === b));
    drawLen();
  }));
  drawLen();

  /* ---------- 공통 그리기 ---------- */
  const signal = (p, x, y, aspect) => {
    mk(p, "line", { x1: x, y1: y + 26, x2: x, y2: y + 70, stroke: "currentColor", "stroke-width": 3, opacity: .5 });
    mk(p, "rect", { x: x - 11, y: y - 16, width: 22, height: 42, rx: 6, fill: "#222" });
    mk(p, "circle", { cx: x, cy: y - 4, r: 6, fill: aspect === "R" ? "var(--occ)" : "#3a3a3a" });
    mk(p, "circle", { cx: x, cy: y + 14, r: 6, fill: aspect === "G" ? "var(--free)" : "#3a3a3a" });
  };
  const rails = (p, x1, x2, y) => {
    mk(p, "line", { x1, y1: y, x2, y2: y, stroke: "var(--rail)", "stroke-width": 4, "stroke-linecap": "round" });
    mk(p, "line", { x1, y1: y + 16, x2, y2: y + 16, stroke: "var(--rail)", "stroke-width": 4, "stroke-linecap": "round" });
  };
  const box = (p, x, y, w, h, label, stroke) => {
    mk(p, "rect", { x, y, width: w, height: h, rx: 7, fill: "var(--card)", stroke: stroke || "currentColor", "stroke-opacity": stroke ? 1 : .4, "stroke-width": stroke ? 2 : 1 });
    T(p, label, { x: x + w / 2, y: y + h / 2 + 5, "text-anchor": "middle", class: "sm", "font-weight": 600 });
  };

  /* ---------- 2. 폐색구간 vs 궤도회로 ---------- */
  const blk = $("blkSvg");
  const BX0 = 70, BX1 = 930, BPX = (BX1 - BX0) / 1800;
  signal(blk, BX0, 34, "G"); signal(blk, BX1, 34, "G");
  mk(blk, "line", { x1: BX0 + 20, y1: 30, x2: BX1 - 20, y2: 30, stroke: "currentColor", "stroke-width": 1.2, "marker-start": "url(#ar0)", "marker-end": "url(#ar0)" });
  const defs = mk(blk, "defs", {});
  const m = mk(defs, "marker", { id: "ar0", viewBox: "0 0 10 10", refX: 5, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
  mk(m, "path", { d: "M0 0L10 5L0 10z", fill: "currentColor" });
  T(blk, "폐색구간 1,800m (예시) — 신호기와 신호기 사이", { x: 500, y: 22, "text-anchor": "middle", class: "sm", "font-weight": 600 });
  // 시도 1: 궤도회로 하나
  T(blk, "궤도회로 하나로 덮으면", { x: BX0 + 20, y: 92, class: "sm", opacity: .8 });
  rails(blk, BX0, BX0 + 1000 * BPX, 104);
  mk(blk, "rect", { x: BX0 + 1000 * BPX, y: 98, width: (BX1 - BX0) - 1000 * BPX, height: 28, fill: "var(--occ)", opacity: .14 });
  mk(blk, "line", { x1: BX0 + 1000 * BPX, y1: 104, x2: BX1, y2: 104, stroke: "var(--occ)", "stroke-width": 4, "stroke-dasharray": "6 6" });
  mk(blk, "line", { x1: BX0 + 1000 * BPX, y1: 120, x2: BX1, y2: 120, stroke: "var(--occ)", "stroke-width": 4, "stroke-dasharray": "6 6" });
  T(blk, "≈1,000m까지만 믿을 수 있음", { x: BX0 + 500 * BPX, y: 146, "text-anchor": "middle", class: "sm", fill: "var(--free)", "font-weight": 600 });
  T(blk, "여기는 신호가 약해 감지를 믿기 어려움", { x: BX0 + 1400 * BPX, y: 146, "text-anchor": "middle", class: "sm", fill: "var(--occ)", "font-weight": 600 });
  // 해결: 둘로 나누기
  T(blk, "그래서 둘로 나누면", { x: BX0 + 20, y: 184, class: "sm", opacity: .8 });
  const cut = BX0 + 900 * BPX;
  rails(blk, BX0, cut - 4, 196); rails(blk, cut + 4, BX1, 196);
  mk(blk, "rect", { x: BX0, y: 190, width: cut - BX0 - 4, height: 28, fill: "var(--free)", opacity: .14 });
  mk(blk, "rect", { x: cut + 4, y: 190, width: BX1 - cut - 4, height: 28, fill: "var(--free)", opacity: .14 });
  mk(blk, "line", { x1: cut, y1: 160, x2: cut, y2: 232, stroke: "var(--relay)", "stroke-width": 2, "stroke-dasharray": "4 4" });
  T(blk, "나눈 지점 · 신호기 없음", { x: cut, y: 172, "text-anchor": "middle", class: "sm", fill: "var(--relay)", "font-weight": 700 });
  T(blk, "30AT (900m)", { x: (BX0 + cut) / 2, y: 254, "text-anchor": "middle", class: "lbl" });
  T(blk, "30BT (900m)", { x: (cut + BX1) / 2, y: 254, "text-anchor": "middle", class: "lbl" });

  /* ---------- 3. 비교 ---------- */
  const drawCmp = (svgEl, relay) => {
    const R0 = 30, R1 = 450, mid = 240, RY = 232;
    rails(svgEl, R0, mid - 3, RY); rails(svgEl, mid + 3, R1, RY);
    T(svgEl, "30AT", { x: (R0 + mid) / 2, y: 282, "text-anchor": "middle", class: "sm", "font-weight": 700 });
    T(svgEl, "30BT", { x: (mid + R1) / 2, y: 282, "text-anchor": "middle", class: "sm", "font-weight": 700 });
    signal(svgEl, R0 + 6, 150, "G");
    box(svgEl, 170, 14, 140, 34, "연동 (EI)");
    box(svgEl, 70, 150, 100, 32, "30AT TR", relay ? "var(--relay)" : null);
    mk(svgEl, "path", { class: "wire", d: `M120 182 V${RY - 2}` });
    mk(svgEl, "path", { d: "M120 150 V90 H220 V50", fill: "none", stroke: "var(--flow)", "stroke-width": 3 });
    if (!relay) {
      box(svgEl, 300, 150, 100, 32, "30BT TR");
      mk(svgEl, "path", { class: "wire", d: `M350 182 V${RY - 2}` });
      mk(svgEl, "path", { d: "M350 150 V90 H260 V50", fill: "none", stroke: "var(--flow)", "stroke-width": 3 });
      T(svgEl, "따로 보내는 선", { x: 360, y: 84, class: "sm", fill: "var(--flow)", "font-weight": 600 });
    } else {
      box(svgEl, 300, 150, 100, 32, "30BT TR");
      mk(svgEl, "path", { class: "wire", d: `M350 182 V${RY - 2}` });
      box(svgEl, 160, 196, 60, 22, "송신");
      mk(svgEl, "path", { class: "wire", d: `M220 207 H${mid - 8} V${RY - 2}` });
      mk(svgEl, "path", { class: "ctl", d: "M300 166 H262 V200" });
      mk(svgEl, "circle", { cx: 248, cy: 207, r: 3, fill: "var(--relay)" });
      T(svgEl, "30BT 접점", { x: 268, y: 140, class: "sm", fill: "var(--relay)", "font-weight": 700 });
    }
    T(svgEl, relay ? "연동은 30AT 하나만 읽음" : "연동이 둘 다 읽어야 함", { x: 240, y: 128, "text-anchor": "middle", class: "sm", opacity: .8 });
  };
  drawCmp($("cmpA"), false);
  drawCmp($("cmpB"), true);

  /* ---------- 4. 방향 ---------- */
  const dir = $("dirSvg");
  rails(dir, 60, 497, 64); rails(dir, 503, 940, 64);
  signal(dir, 66, 36, "G");
  T(dir, "30AT", { x: 280, y: 112, "text-anchor": "middle", class: "sm", "font-weight": 700 });
  T(dir, "30BT", { x: 720, y: 112, "text-anchor": "middle", class: "sm", "font-weight": 700 });
  const d2 = mk(dir, "defs", {});
  const m2 = mk(d2, "marker", { id: "ar1", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, orient: "auto" });
  mk(m2, "path", { d: "M0 0L10 5L0 10z", fill: "var(--accent)" });
  mk(dir, "line", { x1: 180, y1: 24, x2: 820, y2: 24, stroke: "var(--accent)", "stroke-width": 3, "marker-end": "url(#ar1)" });
  T(dir, "열차 진행 방향 (한쪽으로 정해짐)", { x: 500, y: 15, "text-anchor": "middle", class: "sm", fill: "var(--accent)", "font-weight": 700 });
  mk(dir, "path", { class: "ctl", d: "M720 58 V50 H520 V58" });
  T(dir, "30BT가 30AT를 끊음", { x: 620, y: 44, "text-anchor": "middle", class: "sm", fill: "var(--relay)" });
  return () => __off();
}
