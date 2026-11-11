// 한국어 문구. 새 언어는 이 파일을 복사해 값만 번역하면 됩니다 (키는 타입으로 강제됨).
import { koAf } from "./ko.af";

export const ko = {
  "app.name": "Rail-Simulator",
  "app.tagline": "철도 기술과 설비를 눈으로 보고 만져서 배우는 시뮬레이터",
  "app.skip": "본문으로 건너뛰기",
  "app.footer": "교육용 자료입니다. AF궤도회로 내용은 한국철도공사 유지보수 표준화 매뉴얼 등을 바탕으로 하며, 실제 설비 작업은 최신 매뉴얼과 현장 규정을 따르세요.",
  "nav.home": "처음으로",
  "nav.language": "언어",
  "nav.theme": "화면 모드",
  "nav.next": "다음으로 →",
  "nav.prev": "← 이전으로",
  "nav.page": "{n} / {total}",
  "theme.auto": "자동",
  "theme.light": "밝게",
  "theme.dark": "어둡게",

  "home.title": "무엇을 배워볼까요?",
  "home.lead": "각 주제는 직접 조작해 보는 시뮬레이션과 쉬운 설명으로 이루어져 있어요.",
  "home.soon": "준비 중",
  "home.open": "열기",
  "home.level.beginner": "입문",
  "home.level.intermediate": "중급",
  "notfound.title": "페이지를 찾을 수 없어요",

  "mod.signal.title": "신호와 폐색",
  "mod.signal.desc": "구간을 나눠 한 번에 한 열차만 들어가게 하는 원리.",
  "mod.switch.title": "분기기(선로전환기)",
  "mod.switch.desc": "열차가 갈 길을 바꾸는 장치의 구조와 동작.",
  "mod.power.title": "전차선과 급전",
  "mod.power.desc": "전기가 변전소에서 열차까지 오는 길.",

  ...koAf,
} as const;

export type MessageKey = keyof typeof ko;
