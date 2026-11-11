import { t, tk } from "../../i18n";

// 신호의 길: 순서가 곧 장애 점검 순서.
const NODES = ["power", "tx", "txt", "rail", "rxt", "rx", "relay"] as const;
type NodeId = (typeof NODES)[number];
const RAIL = NODES.indexOf("rail");

export function mountSignalPath(root: HTMLElement): () => void {
  let selected = 0;
  let faultAt: number | null = null;
  let train = false;

  root.innerHTML = `
    <h1>${t("mod.af.p3.title")}</h1>
    <p class="lead">${t("mod.af.p3.lead")}</p>

    <h2>${t("mod.af.p3.lab.title")}</h2>
    <section class="card">
      <p class="meta">${t("mod.af.p3.hint")}</p>
      <ol class="flow" id="flow">
        ${NODES.map((id, i) => `<li><button class="node" data-i="${i}" aria-pressed="false">
          <span class="n">${i + 1}</span><b>${tk(`mod.af.p3.n.${id}`)}</b><span class="st"></span></button></li>`).join("")}
      </ol>
      <div class="detail" id="detail" aria-live="polite"></div>
      <div class="controls">
        <button class="btn" id="fault" aria-pressed="false"></button>
        <button class="btn" id="train" aria-pressed="false"></button>
        <span class="relay-pill" id="relay"></span>
      </div>
      <div class="status" id="status" aria-live="polite"></div>
    </section>

    <h2>${t("mod.af.p3.one.title")}</h2>
    <section class="card"><p>${t("mod.af.p3.one.body")}</p></section>

    <h2>${t("mod.af.p3.inst.title")}</h2>
    <p class="lead">${t("mod.af.p3.inst.lead")}</p>
    <section class="card table-wrap"><table>
      <thead><tr><th>${t("mod.af.p3.inst.h0")}</th><th>${t("mod.af.p3.inst.h1")}</th><th>${t("mod.af.p3.inst.h2")}</th></tr></thead>
      <tbody>${[1, 2, 3].map(n => `<tr><th scope="row">${tk(`mod.af.p3.inst.${n}`)}</th><td>${tk(`mod.af.p3.inst.${n}a`)}</td><td>${tk(`mod.af.p3.inst.${n}b`)}</td></tr>`).join("")}</tbody>
    </table></section>

    <h2>${t("mod.af.p3.aux.title")}</h2>
    <section class="card"><dl>
      ${["imp", "tr", "mon", "lmu"].map(k => `<dt>${tk(`mod.af.p3.aux.${k}`)}</dt><dd>${tk(`mod.af.p3.aux.${k}.d`)}</dd>`).join("")}
    </dl><p class="warn gap">${t("mod.af.p3.lmu.warn")}</p></section>
    <p class="meta src">${t("mod.af.source")}</p>`;

  const q = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const btns = Array.from(root.querySelectorAll<HTMLButtonElement>(".node"));
  const detail = q<HTMLElement>("#detail");
  const faultBtn = q<HTMLButtonElement>("#fault");
  const trainBtn = q<HTMLButtonElement>("#train");
  const relayEl = q<HTMLElement>("#relay");
  const statusEl = q<HTMLElement>("#status");

  function render() {
    // 각 장비의 신호 상태: 고장 이전 = 정상, 고장 지점 = 고장, 이후 = 신호 없음. 열차가 있으면 레일 이후는 신호 약함.
    const states = NODES.map((_, i): "ok" | "fault" | "nosig" | "weak" => {
      if (faultAt !== null) {
        if (i < faultAt) return "ok";
        if (i === faultAt) return "fault";
        return "nosig";
      }
      if (train && i >= RAIL) return i === RAIL ? "ok" : "weak";
      return "ok";
    });
    btns.forEach((b, i) => {
      b.className = `node ${states[i]}`;
      b.setAttribute("aria-pressed", String(i === selected));
      b.querySelector(".st")!.textContent = t(`mod.af.p3.state.${states[i]}` as "mod.af.p3.state.ok");
    });
    const id: NodeId = NODES[selected];
    detail.innerHTML = `<b>${tk(`mod.af.p3.n.${id}`)}</b><p>${tk(`mod.af.p3.n.${id}.role`)}</p>
      <dl><dt>${t("mod.af.p3.detail.where")}</dt><dd>${tk(`mod.af.p3.n.${id}.where`)}</dd>
      <dt>${t("mod.af.p3.detail.val")}</dt><dd>${tk(`mod.af.p3.n.${id}.val`)}</dd></dl>`;

    const relayUp = faultAt === null && !train;
    relayEl.textContent = `${tk("mod.af.p3.n.relay")}: ${relayUp ? t("mod.af.p3.relay.up") : t("mod.af.p3.relay.down")}`;
    relayEl.className = "relay-pill " + (relayUp ? "up" : "down");

    faultBtn.textContent = faultAt === selected ? t("mod.af.p3.btnFaultOff") : t("mod.af.p3.btnFault");
    faultBtn.setAttribute("aria-pressed", String(faultAt !== null));
    trainBtn.textContent = train ? t("mod.af.p3.btnTrainOff") : t("mod.af.p3.btnTrain");
    trainBtn.setAttribute("aria-pressed", String(train));

    statusEl.textContent = faultAt !== null
      ? t("mod.af.p3.st.fault", { n: tk(`mod.af.p3.n.${NODES[faultAt]}`) })
      : train ? t("mod.af.p3.st.train") : t("mod.af.p3.st.ok");
  }

  btns.forEach((b, i) => { b.onclick = () => { selected = i; render(); }; });
  faultBtn.onclick = () => { faultAt = faultAt === selected ? null : selected; render(); };
  trainBtn.onclick = () => { train = !train; render(); };
  render();
  return () => {};
}
