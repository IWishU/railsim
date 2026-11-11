import type { MessageKey } from "../i18n";

/** 모듈 안의 한 화면. mount는 화면을 그리고 정리(cleanup) 함수를 돌려준다. */
export interface ModulePage {
  titleKey: MessageKey;
  mount(root: HTMLElement): () => void;
}

/** 모든 학습/시뮬레이션 모듈이 따르는 규격. 새 주제는 이걸 구현해 registry에 추가하면 끝. */
export interface RailModule {
  id: string;
  titleKey: MessageKey;
  descKey: MessageKey;
  level: "beginner" | "intermediate";
  /** 순서대로 '다음으로'로 이어지는 화면들 */
  pages: ModulePage[];
}

/** 아직 만들어지지 않은 주제 (홈에 '준비 중'으로 표시). */
export interface PlannedModule {
  id: string;
  titleKey: MessageKey;
  descKey: MessageKey;
}
