import __html from "./views/summary.html?raw";

/* 5페이지: 최종 정리 — 폐색 전체를 한 장으로.
   느린 앞 열차가 A역에 설 때마다 빠른 뒤 열차가 따라붙고, 신호(3현시)가 간격을 지키는 모습 위에
   ①~④에서 배운 요소(중계·주파수·동조구간·임피던스본드)를 겹쳐 보여 준다. */

const NS = "http://www.w3.org/2000/svg";
type Attrs = Record<string, string | number>;
type Aspect = "R" | "Y" | "G";

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

/* ---- 선로 모형 (순환, px 좌표) ---- */
const X0 = 30, L = 910, RAIL_T = 156, RAIL_B = 182;
const BW = L / 4, CUT = BW * 2.5, PLAT = BW * 3.5, TRAIN_LEN = 64, GAP = 26;
const SECTIONS = [
  { name: "1T", s: 0, e: BW, f: "A", hz: 1699, block: 0 },
  { name: "2T", s: BW, e: BW * 2, f: "B", hz: 2296, block: 1 },
  { name: "3AT", s: BW * 2, e: CUT, f: "A", hz: 1699, block: 2 },
  { name: "3BT", s: CUT, e: BW * 3, f: "B", hz: 2296, block: 2 },
  { name: "4T", s: BW * 3, e: L, f: "A", hz: 1699, block: 3 },
];
const SIG_T = [0, BW, BW * 2, BW * 3];
const BLOCK_NO = ["①", "②", "③", "④"];

interface Train {
  t: number;              // 열차 앞머리 위치 (순환 좌표)
  vmax: number;           // 최고 속도 배율 (앞 열차가 더 느림)
  station: number;        // 정차할 역 위치 (-1 = 없음)
  dwell: number;          // 남은 정차 시간(ms)
  name: string;
  color: string;
  state: "run" | "caution" | "brake" | "stop" | "station";
  sig: string;            // 지금 바라보는 신호기
}

const STATE_LABEL: Record<Train["state"], string> = {
  run: "주행", caution: "서행", brake: "제동", stop: "정지", station: "정차",
};
const STATE_TXT: Record<Train["state"], string> = {
  run: "정상 주행", caution: "주의 — 서행", brake: "정지 현시 접근 — 제동",
  stop: "정지 현시 앞 대기", station: "A역 정차 중",
};
const STATE_COL: Record<Train["state"], string> = {
  run: "var(--free)", caution: "var(--warn)", brake: "var(--warn)",
  stop: "var(--occ)", station: "var(--accent)",
};
const A_COL: Record<Aspect, string> = { R: "var(--occ)", Y: "var(--warn)", G: "var(--free)" };

export function mountSummary(root: HTMLElement): () => void {
  root.innerHTML = `<div class="af">${__html}</div>`;
  const $ = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
  const svg = root.querySelector<SVGSVGElement>("#blockAll")!;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= 그리기 ================= */
  const defs = mk(svg, "defs", {});
  const pat = mk(defs, "pattern", { id: "zh5", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
  mk(pat, "rect", { width: 3, height: 6, fill: "var(--zone)", opacity: 0.6 });

  // 구간 바탕 (점유 = 붉게)
  const bands = SECTIONS.map(sec =>
    mk(svg, "rect", { x: X0 + sec.s + 2, y: 126, width: sec.e - sec.s - 4, height: 62, rx: 5, opacity: 0.15, fill: "var(--free)" }));

  // 폐색 묶음 괄호
  for (let b = 0; b < 4; b++) {
    const xs = X0 + b * BW + 16, xe = X0 + (b + 1) * BW - 10;
    mk(svg, "path", { d: `M${xs} 27 V22 H${xe} V27`, fill: "none", stroke: "currentColor", opacity: 0.45, "stroke-width": 1.4 });
    T(svg, `폐색 ${BLOCK_NO[b]}`, { x: (xs + xe) / 2, y: 16, "text-anchor": "middle", class: "sm", "font-weight": 700, opacity: 0.75 });
  }

  // A역 승강장
  mk(svg, "rect", { x: X0 + PLAT - 58, y: 96, width: 116, height: 9, rx: 3, fill: "var(--muted)", opacity: 0.55 });
  T(svg, "A역", { x: X0 + PLAT, y: 90, "text-anchor": "middle", class: "sm", "font-weight": 700, opacity: 0.8 });

  // 레일
  [RAIL_T, RAIL_B].forEach(y => mk(svg, "line", { x1: X0, y1: y, x2: X0 + L, y2: y, stroke: "var(--rail)", "stroke-width": 5, "stroke-linecap": "round" }));

  // 중계 지점 (3AT|3BT 경계 — 신호기 없음)
  mk(svg, "line", { x1: X0 + CUT, y1: 108, x2: X0 + CUT, y2: 188, stroke: "var(--relay)", "stroke-width": 1.5, "stroke-dasharray": "4 4", opacity: 0.8 });
  mk(svg, "rect", { x: X0 + CUT - 32, y: 86, width: 64, height: 22, rx: 11, fill: "var(--relay)" });
  T(svg, "중계", { x: X0 + CUT, y: 101, "text-anchor": "middle", "font-size": 13, "font-weight": 700, fill: "#fff" });

  // 구간 이름 + 주파수(겹쳐 보기 ③)
  const gFreq = mk(svg, "g", {});
  SECTIONS.forEach(sec => {
    const cx = X0 + (sec.s + sec.e) / 2;
    T(svg, sec.name, { x: cx, y: 222, "text-anchor": "middle", "font-size": 15, "font-weight": 700 });
    mk(gFreq, "rect", { x: X0 + sec.s + 8, y: 206, width: sec.e - sec.s - 16, height: 3.5, rx: 1.75, fill: `var(--f${sec.f})`, opacity: 0.55 });
    T(gFreq, `${sec.f} ${sec.hz.toLocaleString()}Hz`, { x: cx, y: 238, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: `var(--f${sec.f})` });
  });

  // 경계 장비(겹쳐 보기 ③·④): 동조구간 + 튜닝유니트 + 임피던스본드
  const gEq = mk(svg, "g", { visibility: "hidden" });
  [BW, BW * 2, CUT, BW * 3].forEach(t => {
    const x = X0 + t;
    mk(gEq, "rect", { x: x - 5, y: RAIL_T + 2, width: 10, height: RAIL_B - RAIL_T - 4, fill: "url(#zh5)" });
    [x - 15, x + 7].forEach(tx => {
      mk(gEq, "rect", { x: tx, y: RAIL_T - 18, width: 8, height: 12, rx: 2, fill: "var(--card)", stroke: "currentColor", "stroke-width": 1.2 });
      mk(gEq, "line", { x1: tx + 4, y1: RAIL_T - 6, x2: tx + 4, y2: RAIL_T - 1, stroke: "currentColor", "stroke-width": 1.2 });
    });
    mk(gEq, "rect", { x: x - 8, y: RAIL_B + 4, width: 16, height: 15, rx: 4, fill: "var(--card)", stroke: "var(--relay)", "stroke-width": 1.6 });
    T(gEq, "B", { x, y: RAIL_B + 16, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "var(--relay)" });
  });

  // 신호기 4기 (3현시)
  const lampSets = SIG_T.map((t, i) => {
    const x = X0 + t;
    mk(svg, "line", { x1: x, y1: 100, x2: x, y2: RAIL_T - 2, stroke: "currentColor", "stroke-width": 3, opacity: 0.4 });
    mk(svg, "rect", { x: x - 12, y: 34, width: 24, height: 66, rx: 7, fill: "#222" });
    T(svg, "S" + (i + 1), { x: x + 16, y: 44, class: "sm", "font-weight": 700, opacity: 0.7 });
    return {
      R: mk(svg, "circle", { cx: x, cy: 48, r: 7 }),
      Y: mk(svg, "circle", { cx: x, cy: 66, r: 7 }),
      G: mk(svg, "circle", { cx: x, cy: 84, r: 7 }),
    };
  });

  // 관제 표시반
  mk(svg, "rect", { x: X0, y: 252, width: L, height: 94, rx: 10, fill: "var(--board)" });
  T(svg, "관제 표시 (개념) · 빨강 = 점유 · ● = 신호 현시 · ▬ = 열차 위치", { x: X0 + 16, y: 274, "font-size": 12, fill: "var(--board-ink)" });
  const bx = (t: number) => X0 + 18 + t * (L - 36) / L;
  const bsegs = SECTIONS.map(sec => {
    T(svg, sec.name, { x: (bx(sec.s) + bx(sec.e)) / 2, y: 334, "text-anchor": "middle", "font-size": 11.5, "font-weight": 600, fill: "var(--board-ink)" });
    return mk(svg, "line", { x1: bx(sec.s) + 9, y1: 308, x2: bx(sec.e) - 9, y2: 308, "stroke-width": 11, "stroke-linecap": "round" });
  });
  const bdots = SIG_T.map(t => mk(svg, "circle", { cx: bx(t) + 2, cy: 308, r: 5.5, stroke: "var(--board)", "stroke-width": 2 }));

  // 열차 (본체 + 순환 경계용 분신)
  const trains: Train[] = [
    { t: 540, vmax: 0.85, station: PLAT, dwell: 0, name: "앞 열차", color: "var(--accent)", state: "run", sig: "S4" },
    { t: 140, vmax: 1, station: -1, dwell: 0, name: "뒤 열차", color: "var(--fC)", state: "run", sig: "S2" },
  ];
  const bmarks = trains.map(tr => mk(svg, "rect", { x: 0, y: 290, width: 16, height: 7, rx: 2, fill: tr.color }));

  function buildCar(color: string) {
    const g = mk(svg, "g", {});
    mk(g, "rect", { x: -TRAIN_LEN, y: 120, width: TRAIN_LEN, height: 30, rx: 9, fill: color });
    [-56, -40, -24].forEach(wx => mk(g, "rect", { x: wx, y: 127, width: 11, height: 9, rx: 2, fill: "#fff", opacity: 0.85 }));
    [-13, -27, -TRAIN_LEN + 13, -TRAIN_LEN + 27].forEach(cx => mk(g, "circle", { cx, cy: 153, r: 5, fill: "currentColor" }));
    [-15, -TRAIN_LEN + 15].forEach(cx => mk(g, "line", { x1: cx, y1: RAIL_T, x2: cx, y2: RAIL_B, stroke: "var(--warn)", "stroke-width": 3, "stroke-dasharray": "4 3" }));
    const label = T(g, "", { x: -TRAIN_LEN / 2, y: 114, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: color });
    return { g, label };
  }
  const sprites = trains.map(tr => {
    const main = buildCar(tr.color), ghost = buildCar(tr.color);
    return () => {
      const x = X0 + (((tr.t % L) + L) % L);
      main.g.setAttribute("transform", `translate(${x},0)`);
      ghost.g.setAttribute("transform", `translate(${x + L},0)`);   // 꼬리가 오른쪽 끝에 걸칠 때용
      const lbl = `${tr.name} · ${STATE_LABEL[tr.state]}`;
      main.label.textContent = lbl; ghost.label.textContent = lbl;
    };
  });

  /* ================= 상태 계산 ================= */
  const F = { rail2: false, bt: false };
  let running = false, last = 0, speed = 1, raf = 0;

  const overlap = (front: number, s: number, e: number) => {
    for (const k of [-L, 0, L]) if (front + k > s + 0.001 && front + k - TRAIN_LEN < e - 0.001) return true;
    return false;
  };

  function occupancy() {
    const occ = SECTIONS.map(sec =>
      trains.some(tr => overlap(tr.t, sec.s, sec.e)) ||
      (sec.name === "2T" && F.rail2) || (sec.name === "3BT" && F.bt));
    if (occ[3]) occ[2] = true;                       // ② 중계: 3BT 낙하 → 3AT도 낙하
    const blocks = [occ[0], occ[1], occ[2] || occ[3], occ[4]];
    const aspects = blocks.map((o, b) => (o ? "R" : blocks[(b + 1) % 4] ? "Y" : "G") as Aspect);
    return { occ, blocks, aspects };
  }

  function nextSignal(tr: Train, aspects: Aspect[]) {
    let best = L, bi = 0;
    SIG_T.forEach((t, i) => {
      let d = (t - tr.t + L) % L;
      if (d < 0.001) d = L;
      if (d < best) { best = d; bi = i; }
    });
    return { name: "S" + (bi + 1), asp: aspects[bi], dist: best };
  }

  function step(tr: Train, dt: number, aspects: Aspect[]) {
    if (tr.dwell > 0) {                              // 역 정차 중
      tr.dwell -= dt; tr.state = "station";
      if (tr.dwell > 0) return;
    }
    const ns = nextSignal(tr, aspects);
    tr.sig = ns.name;
    const base = 0.085 * speed * tr.vmax * dt * (reduce ? 0.5 : 1);
    let adv = base, braking = false;
    if (ns.asp === "R") {
      const room = ns.dist - GAP;
      if (room <= 0.6) { tr.state = "stop"; return; }
      const f = Math.min(1, room / 130);             // 가까울수록 감속
      adv = Math.min(base * f, room - 0.5); braking = f < 1;
    } else if (ns.asp === "Y") {
      adv = base * 0.55;                             // 주의 현시 = 서행
    }
    if (tr.station >= 0) {                           // A역 통과 시 정차
      const dPlat = (tr.station - tr.t + L) % L;
      if (dPlat > 0.001 && dPlat <= adv) {
        tr.t = tr.station; tr.dwell = 2600 / speed; tr.state = "station";
        return;
      }
    }
    tr.t = (tr.t + adv) % L;
    tr.state = braking ? "brake" : ns.asp === "Y" ? "caution" : "run";
  }

  /* ================= 화면 갱신 ================= */
  const status = $("aStatus"), info = $("aInfo");
  const pills = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>("#aChain li").forEach(li => pills.set(li.dataset.k!, li));

  function update() {
    const { occ, blocks, aspects } = occupancy();
    bands.forEach((band, i) => band.setAttribute("fill", occ[i] ? "var(--occ)" : "var(--free)"));
    lampSets.forEach((ls, i) => {
      ls.R.setAttribute("fill", aspects[i] === "R" ? "var(--occ)" : "#3a3a3a");
      ls.Y.setAttribute("fill", aspects[i] === "Y" ? "var(--warn)" : "#3a3a3a");
      ls.G.setAttribute("fill", aspects[i] === "G" ? "var(--free)" : "#3a3a3a");
    });
    bsegs.forEach((sg, i) => sg.setAttribute("stroke", occ[i] ? "var(--occ)" : "var(--board-off)"));
    bdots.forEach((d, i) => d.setAttribute("fill", A_COL[aspects[i]]));
    trains.forEach((tr, i) => {
      if (!running && tr.state === "run") tr.sig = nextSignal(tr, aspects).name;
      bmarks[i].setAttribute("x", String(bx(((tr.t % L) + L) % L) - 8));
    });
    sprites.forEach(render => render());

    const blockNoOf = (t: number) => BLOCK_NO[Math.floor((((t % L) + L) % L) / BW)];
    info.innerHTML = `
      <div><small>신호 현시</small><b>${aspects.map((a, i) => `S${i + 1}<span style="color:${A_COL[a]}"> ●</span>`).join(" ")}</b></div>
      ${trains.map(tr => `<div><small>${tr.name} (${tr.sig} 방향)</small><b style="color:${STATE_COL[tr.state]}">폐색 ${blockNoOf(tr.t)} · ${STATE_TXT[tr.state]}</b></div>`).join("")}
      <div><small>점유 폐색</small><b>${blocks.filter(Boolean).length} / 4</b></div>`;

    (["shunt", "tr", "tpr"] as const).forEach(k => pills.get(k)!.classList.add("on"));
    pills.get("sig")!.classList.toggle("on", aspects.some(a => a !== "G"));
    const p5 = pills.get("train")!;
    p5.classList.toggle("on", trains.some(tr => tr.state !== "run" && tr.state !== "station"));
    p5.classList.toggle("stop", trains.some(tr => tr.state === "stop"));

    const msgs: string[] = [];
    if (F.rail2) msgs.push("<b>2T 레일 고장</b> — 열차 없이도 2T가 점유되어 S2가 정지를 현시합니다. 고장이 나면 막는 쪽으로, 페일세이프입니다.");
    if (F.bt) msgs.push("<b>3BT 송신 고장</b> — 중계 접점이 열려 3AT까지 함께 점유가 되고, S3 하나가 두 토막 전체를 지킵니다(② 중계궤도).");
    trains.forEach(tr => {
      if (tr.state === "stop") msgs.push(`<b>${tr.name}</b>가 ${tr.sig} 정지 현시 앞에서 대기합니다 — 앞 폐색이 빌 때까지 들어가지 않습니다.`);
      else if (tr.state === "station") msgs.push(`<b>${tr.name}</b>가 A역에 정차 중 — 그동안 폐색 ④가 점유라 S4는 정지입니다.`);
      else if (running && tr.state === "brake") msgs.push(`<b>${tr.name}</b>가 ${tr.sig} 앞에서 제동 중입니다.`);
      else if (running && tr.state === "caution") msgs.push(`<b>${tr.name}</b>는 주의(황색) 현시를 보고 서행하며, 다음 신호에 설 준비를 합니다.`);
    });
    if (!msgs.length) msgs.push(running
      ? "모든 신호 진행 — 두 열차가 신호만 보고 스스로 한 폐색 이상 간격을 지킵니다. 이것이 폐색입니다."
      : "‘운행 시작’을 눌러 보세요. 빠른 뒤 열차가 느린 앞 열차를 따라붙지만, 신호가 간격을 지켜 줍니다.");
    status.innerHTML = msgs.join(" ");
    status.className = "status " + (F.rail2 || F.bt ? "bad" : "ok");
  }

  /* ================= 조작 ================= */
  function frame(ts: number) {
    if (!running) return;
    const dt = last ? Math.min(ts - last, 50) : 16;
    last = ts;
    const { aspects } = occupancy();
    trains.forEach(tr => step(tr, dt, aspects));
    update();
    raf = requestAnimationFrame(frame);
  }
  const playBtn = $("aPlay");
  function setRunning(v: boolean) {
    running = v; last = 0;
    playBtn.textContent = v ? "❚❚ 일시정지" : "▶ 운행 시작";
    if (v) raf = requestAnimationFrame(frame);
    else cancelAnimationFrame(raf);
  }
  playBtn.onclick = () => setRunning(!running);
  $("aReset").onclick = () => {
    setRunning(false);
    trains[0].t = 540; trains[1].t = 140;
    trains.forEach(tr => { tr.state = "run"; tr.dwell = 0; });
    F.rail2 = F.bt = false;
    $("aF2").setAttribute("aria-pressed", "false");
    $("aFB").setAttribute("aria-pressed", "false");
    update();
  };
  ($("aSpeed") as HTMLInputElement).oninput = e => { speed = +(e.target as HTMLInputElement).value; };

  const f2 = $("aF2"), fb = $("aFB");
  f2.onclick = () => { F.rail2 = !F.rail2; f2.setAttribute("aria-pressed", String(F.rail2)); update(); };
  fb.onclick = () => { F.bt = !F.bt; fb.setAttribute("aria-pressed", String(F.bt)); update(); };

  const lf = $("layFreq"), le = $("layEq"), legend = $("aLegend") as HTMLElement;
  lf.onclick = () => {
    const on = lf.getAttribute("aria-pressed") !== "true";
    lf.setAttribute("aria-pressed", String(on));
    gFreq.setAttribute("visibility", on ? "visible" : "hidden");
  };
  le.onclick = () => {
    const on = le.getAttribute("aria-pressed") !== "true";
    le.setAttribute("aria-pressed", String(on));
    gEq.setAttribute("visibility", on ? "visible" : "hidden");
    legend.hidden = !on;
  };

  // 화면이 안 보이면 멈춤 (친환경)
  let wasRunning = false;
  const onVis = () => {
    if (document.hidden) { wasRunning = running; setRunning(false); }
    else if (wasRunning) { wasRunning = false; setRunning(true); }
  };
  document.addEventListener("visibilitychange", onVis);

  update();
  return () => { setRunning(false); document.removeEventListener("visibilitychange", onVis); };
}
