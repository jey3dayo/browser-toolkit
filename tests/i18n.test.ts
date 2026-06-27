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

  it("resolves history and content utility labels from ja resources", () => {
    expect(i18n.t("common.add")).toBe("追加");
    expect(i18n.t("common.dragToReorder")).toBe("ドラッグして並び替え");
    expect(i18n.t("history.title")).toBe("アクション履歴");
    expect(i18n.t("qrCodeOverlay.close")).toBe("閉じる");
    expect(i18n.t("clipboard.errors.unavailable")).toBe(
      "この環境ではクリップボードにコピーできません"
    );
    expect(i18n.t("notifications.downloadSuccess")).toBe(
      "ダウンロードしました"
    );
    expect(i18n.t("overlay.actions.openSettings")).toBe("設定を開く");
    expect(i18n.t("overlay.markdown.toMarkdown")).toBe(
      "Markdown表示に切り替え"
    );
    expect(i18n.t("background.qrCode.unavailableTitle")).toBe(
      "QRコードを表示できません"
    );
    expect(i18n.t("actions.target.source", { source: "選択範囲" })).toBe(
      "使用元: 選択範囲"
    );
    expect(i18n.t("actions.output.running")).toBe("実行中...");
    expect(i18n.t("tableSort.enabledCount", { count: 2 })).toBe(
      "2個のテーブルでソートを有効化しました"
    );
    expect(i18n.t("templates.copyFallbackSuccess")).toBe(
      "テンプレートをコピーしました"
    );
    expect(i18n.t("overlay.summary.title")).toBe("要約");
    expect(i18n.t("overlay.hints.processingMayTakeSeconds")).toBe(
      "処理に数秒かかることがあります。"
    );
    expect(i18n.t("overlay.chat.transcriptLabel")).toBe(
      "フォローアップの会話履歴"
    );
    expect(i18n.t("overlay.chat.jumpToLatest")).toBe("最新の応答へ移動");
  });

  it("resolves remaining popup and background labels from ja resources", () => {
    expect(i18n.t("searchEngines.title")).toBe("検索エンジン");
    expect(i18n.t("searchGroups.title")).toBe("まとめて検索");
    expect(i18n.t("settings.testToken")).toBe("トークン確認");
    expect(i18n.t("templatesPane.new")).toBe("新規追加");
    expect(i18n.t("calendarPane.run")).toBe("抽出する");
    expect(i18n.t("debug.logActions")).toBe("ログ操作");
    expect(i18n.t("tablePane.summary.registeredCount", { count: 2 })).toBe(
      "2件を登録済み"
    );
    expect(
      i18n.t("background.contextActions.actionFailedTitle", {
        title: "要約",
      })
    ).toBe("要約に失敗しました");
    expect(
      i18n.t("content.overlay.errorPrefix", {
        message: "チャット応答に失敗しました",
      })
    ).toBe("エラー: チャット応答に失敗しました");
  });
});
