import { t, tk } from "../../i18n";

type Zone = "TV" | "NIV" | "AV" | "IV" | "OK" | "LOW";
interface Item {
  id: string; unit: string; min: number; max: number; step: number; init: number;
  tv?: number; // 목표값이 한 점인 항목
  zones: [number, number, Zone][]; // [from, to) → 구간
}

// 근거: AF 매뉴얼 주요 측정값 표. AV(경고)는 허용과 조치 사이.
const ITEMS: Item[] = [
  { id: "power", unit: "V", min: 18, max: 34, step: 0.1, init: 24, tv: 24,
    zones: [[18, 22.5, "IV"], [22.5, 30.5, "NIV"], [30.5, 34.01, "IV"]] },
  { id: "tx", unit: "V", min: 5, max: 15, step: 0.1, init: 9.5,
    zones: [[5, 6.4, "IV"], [6.4, 6.8, "AV"], [6.8, 8.5, "NIV"], [8.5, 11.05, "TV"], [11.05, 13.2, "NIV"], [13.2, 13.75, "AV"], [13.75, 15.01, "IV"]] },
  { id: "txt", unit: "V", min: 5, max: 14, step: 0.1, init: 9,
    zones: [[5, 6.1, "IV"], [6.1, 6.5, "AV"], [6.5, 8.1, "NIV"], [8.1, 10.45, "TV"], [10.45, 12.4, "NIV"], [12.4, 13.0, "AV"], [13.0, 14.01, "IV"]] },
  { id: "relay", unit: "V", min: 14, max: 32, step: 0.1, init: 24, tv: 24,
    zones: [[14, 18, "IV"], [18, 21.6, "AV"], [21.6, 26.4, "NIV"], [26.4, 30, "AV"], [30, 32.01, "IV"]] },
  { id: "rx", unit: "mA", min: 0, max: 200, step: 1, init: 100,
    zones: [[0, 15, "LOW"], [15, 200.01, "OK"]] },
];

function classify(it: Item, v: number): Zone {
  if (it.tv !== undefined && Math.abs(v - it.tv) < 0.05) return "TV";
  return it.zones.find(([a, b]) => v >= a && v < b)?.[2] ?? "IV";
}

export function mountInspection(root: HTMLElement): () => void {
  let cur = ITEMS[0];
  let val = cur.init;

  root.innerHTML = `
    <h1>${t("mod.af.p4.title")}</h1>
    <p class="lead">${t("mod.af.p4.lead")}</p>

    <h2>${t("mod.af.p4.lv.title")}</h2>
    <section class="card table-wrap"><table>
      <thead><tr><th>${t("mod.af.p4.lv.h0")}</th><th>${t("mod.af.p4.lv.h1")}</th><th>${t("mod.af.p4.lv.h2")}</th></tr></thead>
      <tbody>${(["TV", "NIV", "AV", "IV"] as const).map(z => `<tr><th scope="row"><span class="zone z-${z}">${tk(`mod.af.p4.lv.${z}`)}</span></th><td>${tk(`mod.af.p4.lv.${z}.m`)}</td><td>${tk(`mod.af.p4.lv.${z}.a`)}</td></tr>`).join("")}</tbody>
    </table><p class="meta gap">${t("mod.af.p4.lv.tip")}</p></section>

    <h2>${t("mod.af.p4.lab.title")}</h2>
    <section class="card">
      <div class="controls">
        <span class="meta">${t("mod.af.p4.lab.pick")}</span>
        <div class="seg" id="items" role="group" aria-label="${t("mod.af.p4.lab.pick")}">
          ${ITEMS.map((it, i) => `<button class="btn" data-i="${i}" aria-pressed="false">${tk(`mod.af.p4.it.${it.id}`)}</button>`).join("")}
        </div>
      </div>
      <p class="meta" id="norm"></p>
      <div class="gauge"><div class="zones" id="zones"></div><div class="marker" id="marker"></div></div>
      <div class="gauge-val"><output id="out"></output></div>
      <input id="slider" type="range" class="wide" aria-label="${t("mod.af.p4.lab.title")}">
      <div class="status" id="result" aria-live="polite"></div>
    </section>

    <h2>${t("mod.af.p4.five.title")}</h2>
    <section class="card"><ul class="five">${[1, 2, 3, 4, 5].map(n => `<li>${tk(`mod.af.p4.five.${n}`)}</li>`).join("")}</ul></section>

    <h2>${t("mod.af.p4.shunt.title")}</h2>
    <section class="card"><p>${t("mod.af.p4.shunt.body")}</p><p class="gap">${t("mod.af.p4.nov.body")}</p></section>

    <h2>${t("mod.af.p4.order.title")}</h2>
    <section class="card table-wrap"><table>
      <thead><tr>${[0, 1, 2, 3].map(n => `<th>${tk(`mod.af.p4.order.h${n}`)}</th>`).join("")}</tr></thead>
      <tbody>${[1, 2, 3, 4, 5, 6].map(n => `<tr><th scope="row">${n}</th><td>${tk(`mod.af.p4.order.${n}`)}</td><td>${tk(`mod.af.p4.order.${n}a`)}</td><td>${tk(`mod.af.p4.order.${n}b`)}</td></tr>`).join("")}</tbody>
    </table></section>

    <h2>${t("mod.af.p4.tips.title")}</h2>
    <section class="card"><ul>${[1, 2, 3, 4, 5].map(n => `<li>${tk(`mod.af.p4.tips.${n}`)}</li>`).join("")}</ul></section>
    <h2>${t("mod.af.p4.proc.title")}</h2>
    <section class="card"><ol>${[1, 2, 3, 4, 5].map(n => `<li>${tk(`mod.af.p4.proc.${n}`)}</li>`).join("")}</ol></section>
    <h2>${t("mod.af.p4.eye.title")}</h2>
    <section class="card"><ul>${[1, 2, 3, 4].map(n => `<li>${tk(`mod.af.p4.eye.${n}`)}</li>`).join("")}</ul></section>
    <p class="meta src">${t("mod.af.source")}</p>`;

  const q = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const btns = Array.from(root.querySelectorAll<HTMLButtonElement>("#items button"));
  const slider = q<HTMLInputElement>("#slider");
  const zonesEl = q<HTMLElement>("#zones");
  const marker = q<HTMLElement>("#marker");
  const out = q<HTMLOutputElement>("#out");
  const result = q<HTMLElement>("#result");
  const norm = q<HTMLElement>("#norm");

  const pct = (v: number) => ((v - cur.min) / (cur.max - cur.min)) * 100;

  function setItem(i: number) {
    cur = ITEMS[i]; val = cur.init;
    slider.min = String(cur.min); slider.max = String(cur.max); slider.step = String(cur.step); slider.value = String(val);
    norm.textContent = tk(`mod.af.p4.it.${cur.id}.n`);
    zonesEl.innerHTML = cur.zones.map(([a, b, z]) =>
      `<i class="z-${z}" style="left:${pct(a)}%;width:${Math.min(pct(b), 100) - pct(a)}%"></i>`).join("")
      + (cur.tv !== undefined ? `<i class="z-TV tvdot" style="left:${pct(cur.tv)}%"></i>` : "");
    btns.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    render();
  }

  function render() {
    marker.style.left = pct(val) + "%";
    out.textContent = `${cur.step < 1 ? val.toFixed(1) : val} ${cur.unit}`;
    const z = classify(cur, val);
    result.className = `status zone-res z-${z}`;
    result.textContent = tk(`mod.af.p4.res.${z}`);
  }

  slider.oninput = () => { val = +slider.value; render(); };
  btns.forEach((b, i) => { b.onclick = () => setItem(i); });
  setItem(0);
  return () => {};
}
