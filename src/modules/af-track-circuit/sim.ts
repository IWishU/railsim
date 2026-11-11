// @ts-nocheck
/* 1페이지: 시뮬레이터 (열차 · 중계궤도 · 계전기실)
   외부에서 만든 시뮬레이션 코드를 사이트 페이지로 옮긴 파일입니다.
   원본 동작을 그대로 두려고 타입 점검은 끄고(ts-nocheck), mount/cleanup만 사이트 규격에 맞췄습니다. */
import __html from "./views/sim.html?raw";

export function mountSim(root: HTMLElement): () => void {
  root.innerHTML = `<div class="af">${__html}</div>`;
  const $ = (id: string) => root.querySelector("#" + id) as any;
  let __off = () => {};
  const NS = "http://www.w3.org/2000/svg";
  const svg = $("track");
  const room = $("room");
  const X0 = 40, W = 230, TRAIN_LEN = 150;
  const RAIL_T = 170, RAIL_B = 200, MIDY = 185;
  const POS_MIN = -TRAIN_LEN - 20, POS_MAX = 1000 + 20;
  const sections = [
    { name: "10T",  freq: 1699, type: "A", signal: true },
    { name: "20T",  freq: 2296, type: "B", signal: true },
    { name: "30AT", freq: 1699, type: "A", signal: true },
    { name: "30BT", freq: 2296, type: "B", signal: false }
  ].map((s, i) => ({ ...s, i, x: X0 + i * W, level: 100, tr: true, tpr: true, feed: true }));
  const S10 = sections[0], S20 = sections[1], SA = sections[2], SB = sections[3];
  let pos = POS_MIN, running = false, last = 0, speed = 1, relayOn = true;
  const F = { rail: false, bt: false, wire: false, tpr: false };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const el = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e); return e;
  };
  const txt = (t, attrs, parent = svg) => { const e = el("text", { fill: "currentColor", ...attrs }, parent); e.textContent = t; return e; };

  /* ---------- 현장 그림 ---------- */
  sections.forEach(s => {
    s.bg = el("rect", { x: s.x + 2, y: RAIL_T - 12, width: W - 4, height: RAIL_B - RAIL_T + 24, rx: 6, opacity: .16 });
    txt(s.name, { x: s.x + W / 2, y: 246, "text-anchor": "middle", "font-size": 22, "font-weight": 600 });
  });
  [RAIL_T, RAIL_B].forEach(y => el("line", { x1: 0, y1: y, x2: 1000, y2: y, "stroke-width": 5, "stroke-linecap": "round", class: "rail" }));
  // 신호 흐름
  sections.forEach(s => { s.flowEl = el("path", { class: "flow", d: "" }); });
  // RX / TX 표시
  sections.forEach(s => {
    if (s !== SB) txt("RX", { x: s.x + 12, y: RAIL_T - 20, "font-size": 15, opacity: .7 });
    if (s !== SA) txt("TX", { x: s.x + W - 12, y: RAIL_T - 20, "font-size": 15, "text-anchor": "end", opacity: .7 });
  });
  // 신호기 (10T, 20T, 30AT 입구)
  sections.filter(s => s.signal).forEach(s => {
    const sx = s.x + 8;
    el("line", { x1: sx, y1: RAIL_T - 30, x2: sx, y2: 40, stroke: "currentColor", "stroke-width": 3, opacity: .5 });
    el("rect", { x: sx - 14, y: 10, width: 28, height: 52, rx: 8, fill: "#222" });
    s.lampTop = el("circle", { cx: sx, cy: 24, r: 8 });
    s.lampBot = el("circle", { cx: sx, cy: 48, r: 8 });
  });
  // 중계 지점 (30BT 입구, 신호기 없음)
  el("line", { x1: SB.x, y1: 128, x2: SB.x, y2: RAIL_B + 12, stroke: "var(--relay)", "stroke-width": 1.5, "stroke-dasharray": "3 4" });
  // 30AT 송신 + 30BT 접점 + 30BT TR
  const g = el("g", {});
  el("rect", { x: 576, y: 96, width: 94, height: 30, rx: 7, fill: "var(--card)", stroke: "currentColor", "stroke-opacity": .35 }, g);
  txt("30AT 송신", { x: 623, y: 116, "text-anchor": "middle", class: "sm", "font-weight": 600 }, g);
  el("path", { class: "wire", d: "M670 111 H684" }, g);
  el("circle", { cx: 686, cy: 111, r: 3.5, fill: "currentColor" }, g);
  el("circle", { cx: 712, cy: 111, r: 3.5, fill: "currentColor" }, g);
  const blade = el("line", { class: "blade", x1: 686, y1: 111, x2: 712, y2: 108 }, g);
  el("path", { class: "wire", d: `M714 111 H${SA.x + W - 12} V${RAIL_T - 3}` }, g);
  const cLabel = txt("30BT 접점", { x: 668, y: 86, "text-anchor": "end", class: "sm", fill: "var(--relay)", "font-weight": 600 }, g);
  const btBox = el("rect", { x: 748, y: 96, width: 90, height: 30, rx: 7, fill: "var(--card)", "stroke-width": 2 }, g);
  const btTxt = txt("30BT TR", { x: 793, y: 116, "text-anchor": "middle", class: "sm", "font-weight": 600 }, g);
  el("path", { class: "wire", d: `M758 126 V${RAIL_T - 3}` }, g);
  const ctl = el("path", { class: "ctl", d: "M793 96 V76 H699 V98" }, g);
  // 열차
  const train = el("g", {});
  el("rect", { x: 0, y: RAIL_T - 26, width: TRAIN_LEN, height: 34, rx: 10, fill: "var(--accent)" }, train);
  [20, 50, TRAIN_LEN - 50, TRAIN_LEN - 20].forEach(cx => {
    el("circle", { cx, cy: RAIL_T + 12, r: 7, fill: "currentColor" }, train);
    el("line", { x1: cx, y1: RAIL_T, x2: cx, y2: RAIL_B, stroke: "var(--warn)", "stroke-width": 3, "stroke-dasharray": "4 3" }, train);
  });
  // 고장 표시
  const mark = (x, y) => { const t = txt("✕", { x, y, "text-anchor": "middle", "font-size": 24, fill: "var(--occ)", visibility: "hidden", "font-weight": 700 }); return t; };
  const crackRail = mark(S20.x + W / 2, RAIL_T + 8);
  const crackBT = mark(SB.x + W - 18, 152);
  const crackWire = mark(SA.x + W - 12, 146);

  /* ---------- 계전기실 그림 ---------- */
  txt("현장", { x: 85, y: 22, "text-anchor": "middle", class: "sm", opacity: .7 }, room);
  txt("계전기실 (RR)", { x: 300, y: 22, "text-anchor": "middle", class: "sm", opacity: .7 }, room);
  el("line", { x1: 160, y1: 30, x2: 160, y2: 196, stroke: "currentColor", opacity: .35, "stroke-dasharray": "4 5" }, room);
  sections.forEach((s, i) => {
    const y = 42 + i * 42;
    s.rTR = el("rect", { x: 30, y: y - 15, width: 110, height: 30, rx: 7, fill: "var(--card)", "stroke-width": 2 }, room);
    txt(s.name + " TR", { x: 85, y: y + 5, "text-anchor": "middle", class: "sm", "font-weight": 600 }, room);
    txt("B24V", { x: 172, y: y - 6, class: "sm", opacity: .6, "font-size": 11 }, room);
    el("circle", { cx: 186, cy: y + 4, r: 3.5, fill: "currentColor" }, room);
    el("path", { class: "wire", d: `M190 ${y + 4} H204` }, room);
    el("circle", { cx: 206, cy: y + 4, r: 3, fill: "currentColor" }, room);
    el("circle", { cx: 230, cy: y + 4, r: 3, fill: "currentColor" }, room);
    s.rBlade = el("line", { class: "blade", x1: 206, y1: y + 4, x2: 230, y2: y + 1 }, room);
    el("path", { class: "wire", d: `M232 ${y + 4} H250` }, room);
    s.rFlow = el("path", { class: "flow", d: `M190 ${y + 4} H248`, "stroke-width": 3 }, room);
    s.rTPR = el("rect", { x: 250, y: y - 15, width: 110, height: 30, rx: 7, fill: "var(--card)", "stroke-width": 2 }, room);
    txt(s.name + " TPR", { x: 305, y: y + 5, "text-anchor": "middle", class: "sm", "font-weight": 600 }, room);
    el("path", { class: "wire", d: `M360 ${y} H430` }, room);
  });
  const tprMark = txt("✕", { x: 241, y: 42 + 2 * 42 + 10, "text-anchor": "middle", "font-size": 18, fill: "var(--occ)", visibility: "hidden", "font-weight": 700 }, room);
  el("rect", { x: 430, y: 26, width: 130, height: 158, rx: 10, fill: "var(--card)", stroke: "currentColor", "stroke-opacity": .35 }, room);
  txt("연동논리부", { x: 495, y: 96, "text-anchor": "middle", class: "lbl" }, room);
  txt("(EI)", { x: 495, y: 116, "text-anchor": "middle", class: "sm", opacity: .7 }, room);
  txt("TPR 접점을 읽음", { x: 495, y: 138, "text-anchor": "middle", class: "sm", opacity: .7 }, room);
  el("path", { class: "wire", d: "M560 92 H660" }, room);
  el("circle", { cx: 600, cy: 92, r: 4, fill: "currentColor" }, room);
  el("path", { class: "wire", d: "M600 96 V146" }, room);
  el("rect", { x: 560, y: 146, width: 80, height: 30, rx: 7, fill: "var(--card)", stroke: "currentColor", "stroke-opacity": .35 }, room);
  txt("광통신부", { x: 600, y: 166, "text-anchor": "middle", class: "sm", "font-weight": 600 }, room);
  el("rect", { x: 660, y: 74, width: 130, height: 36, rx: 7, fill: "var(--card)", stroke: "currentColor", "stroke-opacity": .35 }, room);
  txt("표시제어부", { x: 725, y: 97, "text-anchor": "middle", class: "sm", "font-weight": 600 }, room);
  el("path", { class: "wire", d: "M790 92 H860 V212" }, room);
  el("rect", { x: 30, y: 212, width: 940, height: 78, rx: 10, fill: "var(--board)" }, room);
  txt("표시 화면 (개념) · 빨강 = 점유", { x: 48, y: 234, class: "sm", fill: "var(--board-ink)" }, room);
  const bx = x => 70 + (x - X0) * (860 / 920);
  sections.forEach(s => {
    s.seg = el("line", { x1: bx(s.x) + 6, y1: 256, x2: bx(s.x + W) - 6, y2: 256, "stroke-width": 12, "stroke-linecap": "round" }, room);
    txt(s.name, { x: (bx(s.x) + bx(s.x + W)) / 2, y: 282, "text-anchor": "middle", class: "sm", fill: "var(--board-ink)", "font-weight": 600 }, room);
  });

  /* ---------- 카드 ---------- */
  const cards = $("cards");
  sections.forEach(s => {
    const c = document.createElement("div");
    c.className = "card sec";
    c.innerHTML = `<h3>${s.name} <span class="badge">비점유</span></h3>
      <div class="meta">${s.type}형 ${s.freq.toLocaleString()} Hz</div>
      <div class="bar"><i></i></div>
      <div class="meta lvl">수신 레벨 100%</div>
      <div class="meta relay extra"></div>`;
    cards.appendChild(c); s.card = c;
  });

  const statusEl = $("status");
  const posEl = $("pos");

  function inTrain(s) { return pos + TRAIN_LEN > s.x && pos < s.x + W; }

  function compute() {
    // 30BT 먼저 (30AT가 30BT 접점에 묶여 있으므로)
    const calc = (s, feed, broken) => {
      s.feed = feed; s.occT = inTrain(s); s.broken = broken;
      s.level = !feed || broken ? 0 : s.occT ? 4 : 100;
      s.tr = s.level >= 50;
    };
    calc(S10, true, false);
    calc(S20, true, F.rail);
    calc(SB, !F.bt, false);
    const contactClosed = relayOn ? SB.tr : true;
    const wireOk = relayOn ? !F.wire : true;
    calc(SA, contactClosed && wireOk, false);
    sections.forEach(s => { s.tpr = s.tr && !(s === SA && F.tpr); });
    return { contactClosed, wireOk };
  }

  function aspect(i) {
    // 블록 점유: 10T, 20T, 30A·30B 블록
    const blk = [!S10.tpr, !S20.tpr, relayOn ? !SA.tpr : (!SA.tpr || !SB.tpr), false];
    if (blk[i]) return "R";
    if (blk[i + 1]) return "Y";
    return "G";
  }

  function update() {
    const k = compute();
    const free = "var(--free)", occ = "var(--occ)", warn = "var(--warn)", off = "#3a3a3a";
    svg.querySelectorAll(".rail").forEach(r => r.setAttribute("stroke", "var(--rail)"));

    sections.forEach(s => {
      s.bg.setAttribute("fill", s.tpr ? free : occ);
      // 신호 흐름: TX → RX (차축 또는 끊긴 곳에서 멈춤)
      const start = s.x + W - 14; let end = s.x + 14;
      if (s.occT) end = Math.min(start, Math.max(end, pos + TRAIN_LEN - 20));
      if (s === S20 && F.rail) end = Math.max(end, s.x + W / 2 + 12);
      const show = s.feed && end < start - 4;
      s.flowEl.setAttribute("d", show ? `M${start} ${MIDY} H${end}` : "");
      // 카드
      const b = s.card.querySelector(".badge");
      b.textContent = s.tpr ? "비점유" : "점유"; b.classList.toggle("occ", !s.tpr);
      s.card.querySelector(".bar").classList.toggle("low", s.level < 50);
      s.card.querySelector(".bar>i").style.width = s.level + "%";
      s.card.querySelector(".lvl").textContent = `수신 ${s.level}% · TR ${s.tr ? "여자" : "낙하"} · TPR ${s.tpr ? "여자" : "낙하"}`;
      // 계전기실
      const col = v => v ? "var(--free)" : "var(--occ)";
      s.rTR.setAttribute("stroke", col(s.tr));
      s.rTPR.setAttribute("stroke", col(s.tpr));
      const y = 42 + s.i * 42;
      s.rBlade.setAttribute("x2", s.tr ? 230 : 226); s.rBlade.setAttribute("y2", s.tr ? y + 1 : y - 14);
      s.rBlade.setAttribute("stroke", s.tr ? "currentColor" : "var(--relay)");
      s.rFlow.setAttribute("d", s.tpr ? `M190 ${y + 4} H248` : "");
      s.seg.setAttribute("stroke", s.tpr ? "var(--board-off)" : "var(--occ)");
    });

    // 중계 카드 문구
    SA.card.classList.toggle("relayed", relayOn);
    SB.card.classList.toggle("relayed", relayOn);
    SA.card.querySelector(".extra").textContent = relayOn ? `송신 조건: 30BT 접점 ${k.contactClosed ? "닫힘" : "열림"}` : "중계 없음 (단독 궤도)";
    SB.card.querySelector(".extra").textContent = relayOn ? `30AT 송신을 ${SB.tr ? "통과시킴" : "끊음"}` : "";
    [S10, S20].forEach(s => s.card.querySelector(".extra").textContent = "");

    // 신호기
    sections.filter(s => s.signal).forEach(s => {
      const a = aspect(s.i);
      s.lampTop.setAttribute("fill", a === "R" ? occ : a === "Y" ? warn : off);
      s.lampBot.setAttribute("fill", a === "G" ? free : off);
    });

    // 접점
    const closed = k.contactClosed;
    blade.setAttribute("x2", closed ? 712 : 706); blade.setAttribute("y2", closed ? 108 : 92);
    blade.setAttribute("stroke", closed ? "currentColor" : "var(--relay)");
    [blade, cLabel, ctl, btBox, btTxt].forEach(e => e.setAttribute("visibility", relayOn ? "visible" : "hidden"));
    btBox.setAttribute("stroke", SB.tr ? "var(--free)" : "var(--occ)");
    cLabel.textContent = closed ? "30BT 접점 닫힘" : "30BT 접점 열림";

    train.setAttribute("transform", `translate(${pos},0)`);
    crackRail.setAttribute("visibility", F.rail ? "visible" : "hidden");
    crackBT.setAttribute("visibility", F.bt ? "visible" : "hidden");
    crackWire.setAttribute("visibility", relayOn && F.wire ? "visible" : "hidden");
    tprMark.setAttribute("visibility", F.tpr ? "visible" : "hidden");
    posEl.value = Math.round((pos - POS_MIN) / (POS_MAX - POS_MIN) * 1000);

    // 점검값 (예시)
    $("mTx").textContent = "9.6 V";
    $("mTU").textContent = SA.feed ? "9.1 V" : "0.0 V";
    $("mRx").textContent = SA.tr ? "62 mA" : SA.feed ? "4 mA" : "0 mA";
    $("mTR").textContent = SA.tr ? "24.0 V" : "0.0 V";
    $("mTPR").textContent = SA.tpr ? "24.0 V" : "0.0 V";

    // 상태 문장
    const here = sections.filter(inTrain).map(s => s.name);
    const msg = [];
    if (here.length) msg.push(`${here.join(", ")}에 열차 — 차축이 레일을 단락시켜 수신 레벨이 떨어졌습니다.`);
    if (relayOn && SB.occT && !SA.occT) msg.push(`30AT에는 열차가 없지만 <b>30BT 접점이 열려 30AT 송신이 끊겼습니다(중계)</b>. 30AT도 점유가 되고, 30AT 신호기는 정지입니다.`);
    if (!relayOn && SB.occT && SA.tr) msg.push(`중계가 없으면 30AT TR은 30BT 열차를 모릅니다. 그래서 연동이 30BT TPR까지 따로 읽어야 합니다.`);
    if (F.rail) msg.push("20T는 레일 고장으로 열차가 없어도 ‘점유’입니다 (페일세이프).");
    if (F.bt) msg.push(relayOn ? "30BT 송신 고장 → 30BT 낙하 → <b>접점이 열려 30AT까지 낙하</b>합니다. 30BT부터 점검하세요." : "30BT 송신 고장으로 30BT가 ‘점유’입니다.");
    if (relayOn && F.wire) msg.push("중계 배선 단선 → 송신 출력은 정상인데 30AT TU 입력이 0V입니다. 30BT 접점과 배선을 의심하세요.");
    if (F.tpr) msg.push("30AT TR은 정상인데 TPR이 낙하 → 연동은 점유로 봅니다. TR 접점부터 TPR까지 B24V 회로를 점검하세요.");
    if (!msg.length) msg.push("모든 구간 비점유 — 수신기가 신호를 정상 수신 중입니다.");
    statusEl.innerHTML = msg.join(" ");
  }

  function frame(t) {
    if (!running) return;
    const dt = last ? Math.min(t - last, 50) : 16; last = t;
    pos += dt * 0.09 * speed * (reduce ? 0.5 : 1);
    if (pos > POS_MAX) pos = POS_MIN;
    update();
    requestAnimationFrame(frame);
  }
  const playBtn = $("play");
  function setRunning(v) {
    running = v; last = 0;
    playBtn.textContent = v ? "❚❚ 일시정지" : "▶ 운행 시작";
    if (v) requestAnimationFrame(frame);
  }
  playBtn.onclick = () => setRunning(!running);
  $("reset").onclick = () => { pos = POS_MIN; setRunning(false); update(); };
  $("atStop").onclick = () => { setRunning(false); pos = SA.x + 40; update(); };
  $("btStop").onclick = () => { setRunning(false); pos = SB.x + 40; update(); };
  posEl.oninput = e => { setRunning(false); pos = POS_MIN + (+e.target.value / 1000) * (POS_MAX - POS_MIN); update(); };
  $("speed").oninput = e => speed = +e.target.value;
  const modeBtn = $("mode");
  modeBtn.onclick = () => {
    relayOn = !relayOn; modeBtn.setAttribute("aria-pressed", relayOn);
    modeBtn.textContent = relayOn ? "🔗 중계 연결 켜짐" : "⛓ 중계 연결 꺼짐 (비교)";
    $("fWire").disabled = !relayOn; update();
  };
  [["fRail", "rail"], ["fBT", "bt"], ["fWire", "wire"], ["fTPR", "tpr"]].forEach(([id, key]) => {
    const b = $(id);
    b.onclick = () => { F[key] = !F[key]; b.setAttribute("aria-pressed", F[key]); update(); };
  });
  // 친환경: 화면이 안 보이면 애니메이션 정지
  let wasRunning = false;
  const onVis = () => {
    if (document.hidden) { wasRunning = running; setRunning(false); }
    else if (wasRunning) setRunning(true);
  };
  document.addEventListener("visibilitychange", onVis);
  __off = () => { setRunning(false); document.removeEventListener("visibilitychange", onVis); };
  update();
  return () => __off();
}
