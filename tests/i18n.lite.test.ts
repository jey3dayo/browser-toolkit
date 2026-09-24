import { describe, expect, it } from "vitest";
import { t as i18nextT } from "@/i18n";
import type { TranslationKey } from "@/i18n/keys";
import { t } from "@/i18n/lite";
import { resources } from "@/i18n/resources";
import { isRecord } from "@/utils/guards";

function collectLeafKeys(node: unknown, prefix: string): string[] {
  if (!isRecord(node)) {
    return [];
  }
  return Object.entries(node).flatMap(([key, value]) => {
    const dottedKey = `${prefix}${key}`;
    return typeof value === "string"
      ? [dottedKey]
      : collectLeafKeys(value, `${dottedKey}.`);
  });
}

function resolvesToStringLeaf(key: string): boolean {
  let node: unknown = resources.ja.translation;
  for (const segment of key.split(".")) {
    if (!isRecord(node)) {
      return false;
    }
    node = node[segment];
  }
  return typeof node === "string";
}

function assertIsTranslationKey(key: string): asserts key is TranslationKey {
  if (!resolvesToStringLeaf(key)) {
    throw new Error(`"${key}" does not resolve to a resources string leaf`);
  }
}

const imageZoomKeys = collectLeafKeys(
  resources.ja.translation.imageZoom,
  "imageZoom."
);

describe("i18n lite resolver", () => {
  it("resolves a known nested key to its ja resources string", () => {
    expect(t("imageZoom.close")).toBe("閉じる");
    expect(t("imageZoom.errors.downloadFailed")).toBe(
      "画像のダウンロードに失敗しました"
    );
  });

  it("walked at least one imageZoom leaf key", () => {
    expect(imageZoomKeys.length).toBeGreaterThan(0);
  });

  it("returns the same strings as the i18next-backed t for every imageZoom leaf", () => {
    for (const key of imageZoomKeys) {
      assertIsTranslationKey(key);
      expect(t(key)).toBe(i18nextT(key));
    }
  });

  it("has no interpolation placeholders in imageZoom strings", () => {
    for (const key of imageZoomKeys) {
      assertIsTranslationKey(key);
      expect(t(key)).not.toContain("{{");
    }
  });
});
