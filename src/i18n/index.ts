import i18next from "i18next";
import type { TranslationKey } from "@/i18n/keys";
import { resources } from "@/i18n/resources";

export type { TranslationKey } from "@/i18n/keys";

type TranslationOptions = Record<string, string | number>;

export const i18n = i18next.createInstance();

i18n.init({
  defaultNS: "translation",
  fallbackLng: "ja",
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
  lng: "ja",
  resources,
  supportedLngs: ["ja"],
});

export function t(key: TranslationKey, options?: TranslationOptions): string {
  return i18n.t(key, options);
}
