import { ko, type MessageKey } from "./locales/ko";

export type { MessageKey };
export type Locale = "ko";

// 언어 추가 방법: src/locales/xx.ts 작성 (Record<MessageKey,string>) 후 여기에 등록.
const dictionaries: Record<Locale, Record<MessageKey, string>> = { ko };
export const LOCALES: { code: Locale; label: string }[] = [{ code: "ko", label: "한국어" }];

let current: Locale = "ko";

export function setLocale(l: Locale) {
  current = l;
  document.documentElement.lang = l;
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let s = dictionaries[current][key] ?? dictionaries.ko[key] ?? key;
  if (params) for (const k in params) s = s.replaceAll(`{${k}}`, String(params[k]));
  return s;
}

/** 동적으로 만든 키(예: `mod.af.p3.n.${id}`)용. 없는 키는 키 문자열이 그대로 보인다. */
export const tk = (key: string, params?: Record<string, string | number>) => t(key as MessageKey, params);
