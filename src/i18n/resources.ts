export const resources = {
  ja: {
    translation: {
      contextMenu: {
        batchSearch: "まとめて検索",
        calendar: "カレンダー登録",
        copyTitleLink: "タイトルとリンクをコピー",
        qrCode: "QRコードを表示",
        search: "検索",
        settings: "設定",
        templates: "テンプレートを貼り付け",
      },
      navigation: {
        actions: "アクション",
        calendar: "カレンダー登録",
        table: "サイト別機能",
        createLink: "リンク作成",
        searchEngines: "検索エンジン",
        searchGroups: "まとめて検索",
        templates: "テンプレート",
        history: "履歴",
        historyAria: "アクション履歴",
        debug: "デバッグ",
        settings: "設定",
      },
      sidebar: {
        menu: "メニュー",
      },
      common: {
        close: "閉じる",
      },
      theme: {
        auto: "自動",
        light: "ライト",
        dark: "ダーク",
        buttonLabel: "テーマ: {{current}}（クリックで{{next}}へ）",
      },
      overlay: {
        status: {
          loading: "処理中...",
          error: "エラー",
        },
        source: {
          selection: "選択範囲",
          page: "ページ本文",
        },
      },
    },
  },
} as const;
