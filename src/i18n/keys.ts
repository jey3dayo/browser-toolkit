import type { resources } from "@/i18n/resources";

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
