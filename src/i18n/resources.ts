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
        add: "追加",
        close: "閉じる",
        copy: "コピー",
        dragToReorder: "ドラッグして並び替え",
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
        actions: {
          copy: "コピー",
          openSettings: "設定を開く",
          openGoogleCalendar: "Googleカレンダーに登録",
        },
        event: {
          fields: {
            title: "タイトル",
            datetime: "日時",
            location: "場所",
            description: "概要",
          },
        },
        selectionText: "選択したテキスト",
        pin: {
          pinAriaLabel: "右上に固定",
          unpinAriaLabel: "右上固定を解除",
          description: "右上に固定します。もう一度クリックで解除。",
          title: "ピン留め",
        },
        theme: {
          description: "自動・ライト・ダークを順に切り替えます。",
          title: "テーマ切り替え",
        },
        markdown: {
          toSimple: "シンプル表示に切り替え",
          toMarkdown: "Markdown表示に切り替え",
          description: "Markdown表示とシンプル表示を切り替えます。",
          title: "表示切り替え",
        },
        close: {
          description: "オーバーレイを閉じます。",
        },
        chat: {
          user: "あなた",
          assistant: "AI",
          thinking: "考え中...",
          placeholder: "フォローアップの質問を入力（Enter で送信）",
        },
        summary: {
          title: "要約",
          empty: "要約結果が空でした",
          failed: "要約に失敗しました",
        },
        fallback: {
          emptyResult: "結果が空でした",
          failed: "処理に失敗しました",
        },
        hints: {
          processingMayTakeSeconds: "処理に数秒かかることがあります。",
          openAiTokenMissing:
            "OpenAI API Token未設定の場合は、拡張機能のポップアップ「設定」タブで設定してください。",
        },
      },
      createLink: {
        title: "リンク作成",
        qrCode: "QRコード",
        copy: "コピー",
        description:
          "現在のタブのURLを各形式でコピーします（タイトル/URLは編集できます）。",
        fields: {
          title: "タイトル",
          url: "URL",
          format: "形式",
        },
        panels: {
          qrCode: "QRコード",
          preview: "プレビュー",
        },
        errors: {
          qrGeneration: "QRコードの生成に失敗しました",
          formatSave: "形式の保存に失敗しました",
          emptyContent: "コピーする内容がありません",
          emptyUrl: "URLが空です",
          clipboardUnavailable: "この環境ではクリップボードにコピーできません",
          copyFailed: "コピーに失敗しました",
        },
        success: {
          copied: "コピーしました",
        },
      },
      linkFormat: {
        url: "URL",
        text: "テキスト（タイトル + URL）",
        markdown: "Markdown",
        html: "HTML <a>",
        org: "Org-mode",
        bbcode: "BBCode",
      },
      history: {
        title: "アクション履歴",
        clearAll: "全削除",
        description: "直近20件のアクション実行結果を保存します。",
        empty: "履歴がありません",
        success: {
          cleared: "履歴を削除しました",
          copied: "コピーしました",
        },
        errors: {
          clearFailed: "履歴の削除に失敗しました",
          copyFailed: "コピーに失敗しました",
        },
      },
      actions: {
        output: {
          defaultTitle: "出力",
          running: "実行中...",
          copy: "コピー",
        },
        target: {
          source: "使用元: {{source}}",
          truncated: "長文のため先頭4,000文字のみ表示",
          copiedAriaLabel: "コピーしました",
          copyTextAriaLabel: "テキストをコピー",
          selectionTitle: "選択したテキスト",
          pageTitle: "ページ本文",
          omitted: "(以下省略)",
        },
        success: {
          completed: "完了しました",
        },
        errors: {
          notFound: "アクションが見つかりません",
        },
      },
      qrCodeOverlay: {
        close: "閉じる",
        title: "QRコード",
        errors: {
          generation: "QRコードの生成に失敗しました",
        },
      },
      clipboard: {
        errors: {
          emptyContent: "コピーする内容がありません",
          unavailable: "この環境ではクリップボードにコピーできません",
          copyFailed: "コピーに失敗しました",
          unknown: "不明なエラーが発生しました",
        },
      },
      notifications: {
        copySuccess: "コピーしました",
        copyFailed: "コピーに失敗しました",
        downloadSuccess: "ダウンロードしました",
        downloadFailed: "ダウンロードに失敗しました",
      },
      background: {
        qrCode: {
          unavailableTitle: "QRコードを表示できません",
          missingUrl: "このページのURLを取得できませんでした",
          pageUnavailable: "このページではQRコードを表示できませんでした",
          displayFailed: "QRコードの表示に失敗しました",
          reloadAndRetry:
            "ページを再読み込みしてから、もう一度お試しください。",
        },
      },
      tableSort: {
        headerTitle: "クリックでソート",
        enabledCount: "{{count}}個のテーブルでソートを有効化しました",
        newTablesEnabledCount:
          "{{count}}個の新しいテーブルでソートを有効化しました",
      },
      templates: {
        copyFallbackSuccess: "テンプレートをコピーしました",
      },
    },
  },
} as const;
