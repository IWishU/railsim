import { t, tk } from "../../i18n";

// 정답 번호(1~4). 근거: 노트의 연습문제 답.
const ANSWERS = [2, 2, 2, 3, 3];

export function mountWrapUp(root: HTMLElement): () => void {
  const done: (boolean | null)[] = ANSWERS.map(() => null);

  root.innerHTML = `
    <h1>${t("mod.af.p5.title")}</h1>
    <p class="lead">${t("mod.af.p5.lead")}</p>

    <h2>${t("mod.af.p5.quiz.title")}</h2>
    <div id="quiz">${ANSWERS.map((_, qi) => `
      <section class="card quiz" data-q="${qi}">
        <p><b>${qi + 1}. ${tk(`mod.af.p5.q${qi + 1}`)}</b></p>
        <div class="opts">${[1, 2, 3, 4].map(o => `<button class="btn opt" data-o="${o}">${tk(`mod.af.p5.q${qi + 1}.o${o}`)}</button>`).join("")}</div>
        <p class="fb" aria-live="polite"></p>
      </section>`).join("")}
    </div>
    <div class="controls"><output id="score" class="relay-pill up"></output><button class="btn" id="retry">${t("mod.af.p5.retry")}</button></div>

    <h2>${t("mod.af.p5.faq.title")}</h2>
    <section class="card faq">${[1, 2, 3, 4, 5, 6, 7].map(n => `<details><summary>${tk(`mod.af.p5.faq.${n}`)}</summary><p>${tk(`mod.af.p5.faq.${n}a`)}</p></details>`).join("")}
      <p class="meta gap">${t("mod.af.p5.faq.note")}</p></section>

    <h2>${t("mod.af.p5.gl.title")}</h2>
    <section class="card"><dl>${Array.from({ length: 11 }, (_, i) => i + 1).map(n => `<dt>${tk(`mod.af.p5.gl.${n}`)}</dt><dd>${tk(`mod.af.p5.gl.${n}d`)}</dd>`).join("")}</dl></section>

    <h2>${t("mod.af.p5.src.title")}</h2>
    <section class="card"><ul>${[1, 2, 3, 4].map(n => `<li>${tk(`mod.af.p5.src.${n}`)}</li>`).join("")}</ul>
      <p class="meta gap">${t("mod.af.source")}</p></section>`;

  const score = root.querySelector<HTMLOutputElement>("#score")!;
  const cards = Array.from(root.querySelectorAll<HTMLElement>(".quiz"));

  function renderScore() {
    const n = done.filter(d => d === true).length;
    score.textContent = t("mod.af.p5.score", { n, total: ANSWERS.length });
  }

  cards.forEach((card, qi) => {
    const opts = Array.from(card.querySelectorAll<HTMLButtonElement>(".opt"));
    const fb = card.querySelector<HTMLElement>(".fb")!;
    opts.forEach(btn => {
      btn.onclick = () => {
        if (done[qi] !== null) return; // 한 번만 답함
        const o = +btn.dataset.o!;
        const ok = o === ANSWERS[qi];
        done[qi] = ok;
        opts.forEach(b => {
          b.disabled = true;
          if (+b.dataset.o! === ANSWERS[qi]) b.classList.add("right");
        });
        if (!ok) btn.classList.add("bad");
        fb.textContent = (ok ? t("mod.af.p5.correct") : t("mod.af.p5.wrong")) + tk(`mod.af.p5.q${qi + 1}.e`);
        renderScore();
      };
    });
  });

  root.querySelector<HTMLButtonElement>("#retry")!.onclick = () => {
    done.fill(null);
    cards.forEach(c => {
      c.querySelectorAll<HTMLButtonElement>(".opt").forEach(b => { b.disabled = false; b.classList.remove("right", "bad"); });
      c.querySelector<HTMLElement>(".fb")!.textContent = "";
    });
    renderScore();
  };
  renderScore();
  return () => {};
}
