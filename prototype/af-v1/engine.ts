// AF궤도회로 시뮬레이션 엔진 — 화면(DOM)과 무관한 순수 로직.
export type Aspect = "stop" | "caution" | "clear";

export interface SectionState {
  occupied: boolean;
  cause: "train" | "fault" | null;
  level: number; // 수신 레벨 0~100 (%)
  relayUp: boolean; // 궤도계전기 여자 여부
  aspect: Aspect; // 이 구간 입구 신호기의 현시
}

export interface SectionDef {
  name: string;
  letter: string; // 주파수 유형 (A~H)
  freq: number; // 공칭주파수 Hz
}

export const SECTIONS: SectionDef[] = [
  { name: "1T", letter: "A", freq: 1699 },
  { name: "2T", letter: "B", freq: 2296 },
  { name: "3T", letter: "A", freq: 1699 },
  { name: "4T", letter: "B", freq: 2296 },
];

export class AfTrackCircuit {
  readonly sectionWidth = 220;
  readonly originX = 60;
  readonly trainLength = 150;
  readonly viewWidth = 1000;
  trainX = -this.trainLength - 20;
  faultIndex: number | null = null;

  get startX() { return -this.trainLength - 20; }

  reset() { this.trainX = this.startX; }

  /** dtMs 만큼 열차를 전진시킨다 (끝에 도달하면 처음으로). */
  step(dtMs: number, speed: number, slow = false) {
    this.trainX += dtMs * 0.09 * speed * (slow ? 0.5 : 1);
    if (this.trainX > this.viewWidth + 20) this.trainX = this.startX;
  }

  private trainOver(i: number) {
    const x = this.originX + i * this.sectionWidth;
    return this.trainX + this.trainLength > x && this.trainX < x + this.sectionWidth;
  }

  evaluate(): SectionState[] {
    const base = SECTIONS.map((_, i) => {
      const train = this.trainOver(i);
      const fault = this.faultIndex === i;
      const level = fault ? 0 : train ? 4 : 100;
      return { occupied: train || fault, cause: fault ? "fault" : train ? "train" : null, level } as const;
    });
    return base.map((s, i) => ({
      ...s,
      relayUp: s.level >= 50,
      aspect: s.occupied ? "stop" : base[i + 1]?.occupied ? "caution" : "clear",
    }));
  }
}
