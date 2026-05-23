import i18next from "i18next";
import { resources } from "@/i18n/resources";

type LeafTranslationKeys<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${LeafTranslationKeys<T[K]>}`
      : never;
}[keyof T & string];

export type TranslationKey = LeafTranslationKeys<
  (typeof resources)["ja"]["translation"]
>;
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
