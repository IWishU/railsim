import __html from "./views/bond.html?raw";

/* 4페이지: 임피던스본드 (B1·B2) — 귀선전류는 통과, 신호전류는 차단 (개념도) */

const NS = "http://www.w3.org/2000/svg";
type Attrs = Record<string, string | number>;
type Mode = "ret" | "sig" | "both";

function mk<K extends keyof SVGElementTagNameMap>(
  parent: Element, tag: K, attrs: Attrs = {}, text?: string,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (text !== undefined) e.textContent = text;
  parent.appendChild(e);
  return e;
}
const T = (p: Element, text: string, a: Attrs) => mk(p, "text", { fill: "currentColor", ...a }, text);
const vis = (e: Element, on: boolean) => e.setAttribute("visibility", on ? "visible" : "hidden");

function arrow(p: Element, x: number, y1: number, y2: number, color: string) {
  const d = y2 > y1 ? 1 : -1;
  mk(p, "line", { x1: x, y1, x2: x, y2: y2 - d * 8, stroke: color, "stroke-width": 4, "stroke-linecap": "round" });
  mk(p, "path", { d: `M${x} ${y2} L${x - 6} ${y2 - d * 11} L${x + 6} ${y2 - d * 11} Z`, fill: color });
}

export function mountBond(root: HTMLElement): () => void {
  root.innerHTML = `<div class="af">${__html}</div>`;
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;

  /* ================= 2. 본드 개념도 ================= */
  const svg = root.querySelector<SVGSVGElement>("#bondSvg")!;
  const UY = 80, LY = 280, CY = 180, BX = 520, LEAD = 68, TAP_END = 940, FAULT_X = 640;
  const RET = "var(--relay)", SIG = "var(--flow)";

  mk(svg, "rect", { x: 30, y: 40, width: BX - 30, height: 280, rx: 8, fill: SIG, opacity: 0.05 });
  mk(svg, "rect", { x: BX, y: 40, width: 970 - BX, height: 280, rx: 8, fill: "var(--rail)", opacity: 0.07 });
  T(svg, "이 구간 안 (신호가 오가는 곳)", { x: 275, y: 30, "text-anchor": "middle", class: "sm", opacity: 0.8 });
  T(svg, "이웃 쪽 (신호가 넘어오면 안 되는 곳)", { x: 745, y: 30, "text-anchor": "middle", class: "sm", opacity: 0.8 });

  [UY, LY].forEach(y => mk(svg, "line", { x1: 30, y1: y, x2: 970, y2: y, stroke: "var(--rail)", "stroke-width": 6, "stroke-linecap": "round" }));
  T(svg, "위 레일", { x: 936, y: UY - 12, class: "sm", opacity: 0.6, "text-anchor": "end" });
  T(svg, "아래 레일", { x: 936, y: LY + 24, class: "sm", opacity: 0.6, "text-anchor": "end" });

  // 송신기(TX)
  mk(svg, "path", { class: "wire", d: `M90 ${UY} V${CY - 20} M90 ${CY + 20} V${LY}` });
  mk(svg, "rect", { x: 50, y: CY - 20, width: 80, height: 40, rx: 7, fill: "var(--card)", stroke: "currentColor", "stroke-opacity": 0.4 });
  T(svg, "송신(TX)", { x: 90, y: CY + 5, "text-anchor": "middle", class: "sm", "font-weight": 600 });

  // 본드 ↔ 레일 연결선, 중성점선 (크기에 따라 길이가 바뀜)
  const wTop = mk(svg, "line", { class: "wire", x1: BX, y1: UY, x2: BX, y2: CY - LEAD });
  const wBot = mk(svg, "line", { class: "wire", x1: BX, y1: LY, x2: BX, y2: CY + LEAD });
  const tapWire = mk(svg, "line", { class: "wire", x1: BX, y1: CY, x2: TAP_END, y2: CY });
  const tapFaint = mk(svg, "line", { class: "wire", x1: 700, y1: CY, x2: TAP_END, y2: CY, "stroke-dasharray": "3 6", opacity: 0.4 });
  [UY, LY].forEach(y => mk(svg, "circle", { cx: BX, cy: y, r: 5, fill: "currentColor" }));

  // ---- 귀선전류 흐름 (같은 방향) ----
  const gRet = mk(svg, "g", {});
  mk(gRet, "path", { class: "bflow ret", d: `M170 ${UY + 9} H${BX}` });
  mk(gRet, "path", { class: "bflow ret", d: `M170 ${LY - 9} H${BX}` });
  const fTop = mk(gRet, "path", { class: "bflow ret" });
  const fBot = mk(gRet, "path", { class: "bflow ret" });
  const fTap = mk(gRet, "path", { class: "bflow ret" });
  T(gRet, "귀선전류 → 같은 방향", { x: 170, y: UY + 38, class: "sm", fill: RET, "font-weight": 700 });
  T(gRet, "귀선 → 변전소 방향", { x: TAP_END, y: CY - 12, "text-anchor": "end", class: "sm", fill: RET, "font-weight": 700 });
  const faultRing = mk(svg, "g", {});
  mk(faultRing, "circle", { class: "ring", cx: FAULT_X, cy: CY, r: 18, fill: "none", stroke: "var(--occ)", "stroke-width": 2.5 });
  mk(faultRing, "circle", { class: "ring d2", cx: FAULT_X, cy: CY, r: 18, fill: "none", stroke: "var(--occ)", "stroke-width": 2.5 });
  const faultMark = T(svg, "✕", { x: 670, y: CY + 9, "text-anchor": "middle", "font-size": 26, fill: "var(--occ)", "font-weight": 700 });

  // ---- 신호전류 흐름 (반대 방향) ----
  const gSig = mk(svg, "g", {});
  mk(gSig, "path", { class: "bflow sig", d: `M90 ${UY - 9} H${BX}` });
  mk(gSig, "path", { class: "bflow sig", d: `M${BX} ${LY + 9} H90` });
  mk(gSig, "path", { class: "bflow sig dim", d: `M${BX} ${UY} V${UY + 28}` });
  mk(gSig, "path", { class: "bflow sig dim", d: `M${BX} ${LY} V${LY - 28}` });
  [UY, LY].forEach(y => {
    mk(gSig, "circle", { class: "ring", cx: BX, cy: y, r: 16, fill: "none", stroke: SIG, "stroke-width": 2.5 });
    mk(gSig, "circle", { class: "ring d2", cx: BX, cy: y, r: 16, fill: "none", stroke: SIG, "stroke-width": 2.5 });
  });
  T(gSig, "신호전류 ⇄ 반대 방향", { x: 140, y: UY - 24, class: "sm", fill: SIG, "font-weight": 700 });
  T(gSig, "✕ 여기서 막힘", { x: BX + 22, y: UY - 20, class: "sm", fill: SIG, "font-weight": 700 });

  // ---- 본드 본체 (중성점 코일 + 철심 + 자속) ----
  const gBond = mk(svg, "g", {});
  mk(gBond, "line", { x1: -24, y1: -74, x2: -24, y2: 74, stroke: "currentColor", "stroke-width": 3, opacity: 0.65 });
  mk(gBond, "line", { x1: -31, y1: -74, x2: -31, y2: 74, stroke: "currentColor", "stroke-width": 3, opacity: 0.65 });
  const bump = "a10 10 0 0 0 0 20 ".repeat(3);
  mk(gBond, "path", { d: `M0 ${-LEAD} ${bump}`, fill: "none", stroke: "currentColor", "stroke-width": 2.4 });
  mk(gBond, "path", { d: `M0 8 ${bump}`, fill: "none", stroke: "currentColor", "stroke-width": 2.4 });
  mk(gBond, "line", { x1: 0, y1: -8, x2: 0, y2: 8, stroke: "currentColor", "stroke-width": 2.4 });
  mk(gBond, "circle", { cx: 0, cy: 0, r: 4.5, fill: "currentColor" });
  const coilRet = mk(gBond, "g", {});
  mk(coilRet, "path", { class: "bflow ret", d: `M0 ${-LEAD} V-8` });
  mk(coilRet, "path", { class: "bflow ret", d: `M0 ${LEAD} V8` });
  // 자속: 귀선 = 서로 반대(상쇄), 신호 = 같은 방향(합쳐짐)
  const fluxRet = mk(gBond, "g", {});
  arrow(fluxRet, -56, -62, -10, RET); arrow(fluxRet, -56, 62, 10, RET);
  T(fluxRet, "✕", { x: -56, y: 8, "text-anchor": "middle", "font-size": 20, fill: RET, "font-weight": 700 });
  T(fluxRet, "상쇄", { x: -56, y: -74, "text-anchor": "middle", class: "sm", fill: RET, "font-weight": 700 });
  const fluxSig = mk(gBond, "g", {});
  arrow(fluxSig, -92, -62, -4, SIG); arrow(fluxSig, -92, 4, 62, SIG);
  T(fluxSig, "합쳐짐", { x: -100, y: -74, "text-anchor": "middle", class: "sm", fill: SIG, "font-weight": 700 });

  T(svg, "중성점 (센터탭)", { x: BX + 16, y: CY - 10, class: "sm", "font-weight": 600 });
  const bondName = T(svg, "", { x: BX + 16, y: CY + 36, "font-size": 16, "font-weight": 700, fill: RET });
  T(svg, "두 레일에 걸쳐 단 코일", { x: BX + 16, y: CY + 56, class: "sm", opacity: 0.7 });

  /* ---- 상태 ---- */
  let mode: Mode = "both", size: "B1" | "B2" = "B2", fault = false;

  function layout() {
    const s = size === "B1" ? 1 : 0.76;
    gBond.setAttribute("transform", `translate(${BX},${CY}) scale(${s})`);
    wTop.setAttribute("y2", String(CY - LEAD * s));
    wBot.setAttribute("y2", String(CY + LEAD * s));
    fTop.setAttribute("d", `M${BX} ${UY + 9} V${CY - LEAD * s}`);
    fBot.setAttribute("d", `M${BX} ${LY - 9} V${CY + LEAD * s}`);
    bondName.textContent = size === "B1" ? "B1 임피던스본드 (대형)" : "B2 임피던스본드 (소형)";
  }

  const info = $("bondInfo"), status = $("bondStatus");
  function update() {
    const ret = mode !== "sig", sig = mode !== "ret";
    layout();
    vis(gRet, ret); vis(coilRet, ret); vis(fluxRet, ret);
    vis(gSig, sig); vis(fluxSig, sig);
    vis(faultMark, fault); vis(tapFaint, fault); vis(faultRing, fault && ret);
    tapWire.setAttribute("x2", String(fault ? FAULT_X : TAP_END));
    fTap.setAttribute("d", `M${BX} ${CY} H${fault ? FAULT_X : TAP_END}`);

    const pass = mode === "both" ? "귀선 통과 · 신호 차단" : ret ? "귀선전류 통과" : "신호전류 차단";
    const z = mode === "both" ? "방향마다 다름" : ret ? "낮음 (자속 상쇄)" : "높음 (자속 합쳐짐)";
    info.innerHTML = `
      <div><small>선택한 본드</small><b>${size} · ${size === "B1" ? "대형" : "소형"}</b></div>
      <div><small>전류의 운명</small><b>${fault && ret ? "귀선이 갈 곳 없음" : pass}</b></div>
      <div><small>코일 임피던스</small><b>${z}</b></div>
      <div><small>중성점 접속</small><b style="color:var(--${fault ? "occ" : "free"})">${fault ? "풀림 (예시)" : "연결됨"}</b></div>`;

    let msg: string;
    if (fault && ret) {
      msg = `<b style="color:var(--occ)">중성점 접속이 풀렸습니다(예시).</b> 귀선전류가 모여 빠져나갈 낮은 임피던스 길이 사라집니다. ${sig ? "신호전류는 이 고장과 상관없이 여전히 막혀 있습니다. " : ""}점검에서 <b>임피던스본드 단자 체결</b>을 확인하는 이유입니다.`;
    } else if (mode === "both") {
      msg = `<b>두 전류가 같은 레일에 섞여 있어도</b> 본드는 방향으로 구별합니다. 귀선전류(같은 방향)는 <b style="color:var(--relay)">중성점으로 빠져나가고</b>, 신호전류(반대 방향)는 <b style="color:var(--flow)">구간 밖으로 새지 못합니다.</b>`;
    } else if (ret) {
      msg = `귀선전류는 두 레일에서 <b>같은 방향</b>으로 흘러 본드 양 끝으로 들어와 중성점으로 모입니다. 위·아래 반쪽 코일의 자속이 서로 <b>상쇄</b>되어 코일이 거의 없는 것처럼 지나갑니다.`;
    } else {
      msg = `신호전류는 두 레일에서 <b>반대 방향</b>이라 코일을 끝에서 끝까지 가로지르려 합니다. 두 반쪽 코일의 자속이 <b>합쳐져</b> 임피던스가 크고, 신호는 본드를 지나지 못해 구간 안에 갇힙니다.`;
    }
    if (size === "B2") msg += ` <span class="meta">(B2는 소형, B1은 대형 — 이 그림은 크기만 다르게 그렸습니다.)</span>`;
    status.innerHTML = msg;
    status.className = "status " + (fault && ret ? "bad" : "ok");
  }

  root.querySelectorAll<HTMLButtonElement>(".bmode").forEach(b => b.addEventListener("click", () => {
    mode = b.dataset.m as Mode;
    root.querySelectorAll(".bmode").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    update();
  }));
  root.querySelectorAll<HTMLButtonElement>(".bsize").forEach(b => b.addEventListener("click", () => {
    size = b.dataset.s as "B1" | "B2";
    root.querySelectorAll(".bsize").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    update();
  }));
  const fBtn = $("bFault");
  fBtn.addEventListener("click", () => { fault = !fault; fBtn.setAttribute("aria-pressed", String(fault)); update(); });
  update();

  /* ================= 4. 주파수 ↔ 임피던스 (개념 곡선) ================= */
  const g = root.querySelector<SVGSVGElement>("#bzSvg")!;
  const GX0 = 80, GX1 = 940, GBASE = 230, FMAX = 3000;
  const gx = (f: number) => GX0 + (f / FMAX) * (GX1 - GX0);
  const lvl = (f: number) => 1 - Math.exp(-f / 900);
  const zd = (f: number) => GBASE - 180 * lvl(f);
  const zc = (f: number) => GBASE - 6 - 14 * (f / FMAX);

  mk(g, "rect", { x: gx(1549), y: 40, width: gx(2593) - gx(1549), height: GBASE - 40, fill: "var(--zone)", opacity: 0.15 });
  T(g, "AF 신호 대역", { x: (gx(1549) + gx(2593)) / 2, y: 140, "text-anchor": "middle", class: "sm", fill: "var(--zone)", "font-weight": 700 });
  T(g, "1,549~2,593Hz", { x: (gx(1549) + gx(2593)) / 2, y: 158, "text-anchor": "middle", class: "sm", fill: "var(--zone)", "font-weight": 700 });
  mk(g, "line", { x1: GX0, y1: GBASE, x2: GX1, y2: GBASE, stroke: "currentColor", opacity: 0.4 });
  mk(g, "line", { x1: GX0, y1: 36, x2: GX0, y2: GBASE, stroke: "currentColor", opacity: 0.4 });
  T(g, "임피던스 (상대적 크기)", { x: GX0 + 8, y: 30, class: "sm", opacity: 0.75 });
  for (let f = 0; f <= FMAX; f += 500) {
    mk(g, "line", { x1: gx(f), y1: GBASE, x2: gx(f), y2: GBASE + 6, stroke: "currentColor", opacity: 0.5 });
    T(g, f.toLocaleString(), { x: gx(f), y: GBASE + 22, "text-anchor": "middle", class: "sm", opacity: 0.7 });
  }
  T(g, "주파수 (Hz)", { x: GX1, y: GBASE + 40, "text-anchor": "end", class: "sm", opacity: 0.7 });
  mk(g, "line", { x1: gx(60), y1: 60, x2: gx(60), y2: GBASE, stroke: "var(--relay)", "stroke-dasharray": "4 5", opacity: 0.8 });
  T(g, "전철 전원 (예: 60Hz)", { x: gx(60) + 8, y: 76, class: "sm", fill: "var(--relay)", "font-weight": 700 });

  const curve = (fn: (f: number) => number) => {
    let d = "";
    for (let f = 0; f <= FMAX; f += 30) d += (d ? " L" : "M") + gx(f).toFixed(1) + " " + fn(f).toFixed(1);
    return d;
  };
  mk(g, "path", { d: curve(zd), fill: "none", stroke: SIG, "stroke-width": 3.5 });
  mk(g, "path", { d: curve(zc), fill: "none", stroke: RET, "stroke-width": 3.5 });
  T(g, "신호 방향 (반대 방향 전류)", { x: GX1, y: 44, "text-anchor": "end", class: "sm", fill: SIG, "font-weight": 700 });
  T(g, "귀선 방향 (같은 방향 전류)", { x: GX1, y: 196, "text-anchor": "end", class: "sm", fill: RET, "font-weight": 700 });
  const mLine = mk(g, "line", { y1: 36, y2: GBASE, stroke: "currentColor", "stroke-dasharray": "4 4", opacity: 0.55 });
  const mD = mk(g, "circle", { r: 8, fill: SIG, stroke: "var(--card)", "stroke-width": 2 });
  const mC = mk(g, "circle", { r: 8, fill: RET, stroke: "var(--card)", "stroke-width": 2 });

  const fIn = $("bzF") as HTMLInputElement, fVal = $("bzFv"), bzStatus = $("bzStatus");
  const word = (v: number) => (v < 0.25 ? "낮음" : v < 0.65 ? "중간" : "높음");
  function drawF() {
    const f = +fIn.value, x = gx(f);
    fVal.textContent = `${f.toLocaleString()} Hz`;
    mLine.setAttribute("x1", String(x)); mLine.setAttribute("x2", String(x));
    mD.setAttribute("cx", String(x)); mD.setAttribute("cy", String(zd(f)));
    mC.setAttribute("cx", String(x)); mC.setAttribute("cy", String(zc(f)));
    const w = word(lvl(f));
    const where = f >= 1549 && f <= 2593
      ? "AF 신호 대역입니다. 신호는 크게 막혀 구간 안에 갇힙니다."
      : f <= 150 ? "전철 전원 쪽의 낮은 주파수입니다. 본드가 귀선전류를 거의 막지 않고 통과시킵니다."
      : "이 주파수에서의 상대적 경향을 보여 줍니다.";
    bzStatus.innerHTML = `<b>${f.toLocaleString()}Hz</b> — 신호(반대 방향) 임피던스 <b style="color:var(--flow)">${w}</b>, 귀선(같은 방향) 임피던스 <b style="color:var(--relay)">낮음</b>. ${where}`;
    bzStatus.className = "status ok";
  }
  fIn.addEventListener("input", drawF);
  root.querySelectorAll<HTMLButtonElement>(".bzp").forEach(b => b.addEventListener("click", () => { fIn.value = b.dataset.f!; drawF(); }));
  drawF();

  return () => {};
}
