import { describe, expect, it } from "vitest";
import { t as i18nextT } from "@/i18n";
import type { TranslationKey } from "@/i18n/keys";
import { t } from "@/i18n/lite";

const IMAGE_ZOOM_KEYS = [
  "imageZoom.close",
  "imageZoom.dialogLabel",
  "imageZoom.download",
  "imageZoom.errors.downloadFailed",
  "imageZoom.errors.downloadInvalidUrl",
  "imageZoom.errors.loadFailed",
] satisfies TranslationKey[];

describe("i18n lite resolver", () => {
  it("resolves a known nested key to its ja resources string", () => {
    expect(t("imageZoom.close")).toBe("閉じる");
    expect(t("imageZoom.errors.downloadFailed")).toBe(
      "画像のダウンロードに失敗しました"
    );
  });

  it("returns the same strings as the i18next-backed t for the image-zoom keys", () => {
    for (const key of IMAGE_ZOOM_KEYS) {
      expect(t(key)).toBe(i18nextT(key));
    }
  });
});
