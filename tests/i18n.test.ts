import { describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { navigationItems } from "@/popup/navigation-items";

describe("i18n", () => {
  it("resolves context menu labels from ja resources", () => {
    expect(i18n.t("contextMenu.qrCode")).toBe("QRコードを表示");
  });

  it("resolves every navigation metadata key", () => {
    for (const item of navigationItems) {
      expect(i18n.exists(item.labelKey)).toBe(true);
      expect(i18n.exists(item.ariaLabelKey)).toBe(true);
    }
  });

  it("resolves create link pane labels from ja resources", () => {
    expect(i18n.t("createLink.title")).toBe("リンク作成");
    expect(i18n.t("createLink.fields.format")).toBe("形式");
    expect(i18n.t("linkFormat.text")).toBe("テキスト（タイトル + URL）");
  });
});
