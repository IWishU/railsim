// 주파수 간섭 모델 — 화면과 무관한 순수 로직.
// 주파수: 한국철도공사 AF궤도회로장치 매뉴얼(TI21형) 공칭주파수.
export const FREQS = [
  { letter: "A", hz: 1699 },
  { letter: "B", hz: 2296 },
  { letter: "C", hz: 1996 },
  { letter: "D", hz: 2593 },
  { letter: "E", hz: 1549 },
  { letter: "F", hz: 2146 },
  { letter: "G", hz: 1848 },
  { letter: "H", hz: 2445 },
] as const;

export const SECTION_COUNT = 6;

/** 선로 쌍(0:A·B, 1:C·D, 2:E·F, 3:G·H). 이웃 구간끼리 번갈아 배치하고, same이면 한 가지로만 채운다. */
export function assignment(pair: number, same: boolean): number[] {
  const a = pair * 2;
  return Array.from({ length: SECTION_COUNT }, (_, i) => (same || i % 2 === 0 ? a : a + 1));
}

export interface InterferenceResult {
  level: number; // 수신기에 들어온 총 레벨(%)
  leakPct: number; // 그중 이웃 구간에서 새어 들어온 양
  relayUp: boolean; // 궤도계전기 여자(= 비점유로 판단)
  detectedOccupied: boolean;
}

const LEAK = 70; // 같은 주파수 이웃 송신 신호가 새어 들어오는 양(%, 개념 모형의 예시값)
const TRAIN_SHUNT = 4; // 열차가 있을 때 자기 송신 신호가 수신기에 닿는 양(%)

export function evaluateInterference(freqIdx: number[], trainSection: number): InterferenceResult[] {
  return freqIdx.map((f, i) => {
    const own = i === trainSection ? TRAIN_SHUNT : 100;
    // 수신기는 자기 주파수만 듣기 때문에, 같은 주파수인 이웃의 신호만 영향을 준다.
    let leak = 0;
    for (const n of [i - 1, i + 1]) if (n >= 0 && n < freqIdx.length && freqIdx[n] === f) leak += LEAK;
    const level = Math.min(100, own + leak);
    const relayUp = level >= 50;
    return { level, leakPct: Math.min(100, leak), relayUp, detectedOccupied: !relayUp };
  });
}
