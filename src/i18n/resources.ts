export const resources = {
  ja: {
    translation: {
      actions: {
        editor: {
          clear: "クリア",
          eventHelpAria: "eventとは",
          eventHelpDescription:
            "event は日時・場所・概要などを抽出してイベント形式で返すモードです。 text はプロンプトに従って要約/翻訳などを行います。",
          eventHelpTitle: "event とは",
          kind: "種類",
          newAction: "新規作成",
          prompt: "プロンプト",
          target: "対象",
          title: "アクション編集",
          titleField: "タイトル",
        },
        errors: {
          deleteFailed: "削除に失敗しました",
          notFound: "アクションが見つかりません",
          promptRequired: "プロンプトを入力してください",
          resetFailed: "リセットに失敗しました",
          saveFailed: "保存に失敗しました",
          titleRequired: "タイトルを入力してください",
        },
        kind: {
          event: "イベント",
          text: "テキスト",
        },
        output: {
          copy: "コピー",
          defaultTitle: "出力",
          running: "実行中...",
        },
        reorder: {
          description:
            "ドラッグ&ドロップで並び替えできます。右クリックメニューの順序に反映されます。",
          empty: "アクションがありません",
          saved: "並び替えを保存しました",
          saveFailed: "並び替えの保存に失敗しました",
          title: "並び順編集",
        },
        success: {
          completed: "完了しました",
          deleted: "削除しました",
          reset: "リセットしました",
          saved: "保存しました",
        },
        target: {
          copiedAriaLabel: "コピーしました",
          copyTextAriaLabel: "テキストをコピー",
          omitted: "(以下省略)",
          pageTitle: "ページ本文",
          selectionTitle: "選択したテキスト",
          source: "使用元: {{source}}",
          truncated: "長文のため先頭4,000文字のみ表示",
        },
        templateVars: "テンプレ変数:",
        title: "Context Actions",
      },
      background: {
        actionExecutor: {
          emptyPrompt: "プロンプトが空です",
        },
        contextActions: {
          actionFailedTitle: "{{title}}に失敗しました",
          actionMissing:
            "アクションが見つかりません（ポップアップで再保存してください）",
          calendarFailedTitle: "カレンダー登録に失敗しました",
          calendarInitialTitle: "カレンダー登録（{{source}}）",
          calendarTargetMissing:
            "カレンダー登録先が未選択です（ポップアップの「カレンダー」タブで設定してください）",
          selectionPrefix: "選択範囲:\n{{text}}",
          source: {
            page: "ページ本文",
            selection: "選択範囲",
          },
          summarizeFailed: "要約に失敗しました",
        },
        copyTitleLink: {
          badgeTitle:
            "{{appName}}: このページではコピーできません\n{{pageLabel}}\n（ポップアップ「リンク作成」からコピーできます）",
          copied: "コピーしました",
          copyFailed: "コピーに失敗しました",
          emptyContent: "コピーする内容がありません",
          fallbackHint: "ポップアップの「リンク作成」タブからコピーできます。",
          fallbackPage: "このページ",
          fallbackSecondary:
            "自動コピーに失敗しました。上のボタンでコピーしてください。",
          title: "タイトルとリンクをコピー",
        },
        debug: {
          clearFailed: "デバッグログのクリアに失敗しました",
          downloadFailed: "デバッグログのダウンロードに失敗しました",
          getLogsFailed: "デバッグログの取得に失敗しました",
          statsFailed: "デバッグログ統計の取得に失敗しました",
        },
        geminiResearch: {
          copyFallbackSuccess:
            "Geminiへの自動入力に失敗したため、プロンプトをコピーしました",
        },
        messaging: {
          pageUnavailable: "このページでは実行できません（{{message}}）",
        },
        qrCode: {
          displayFailed: "QRコードの表示に失敗しました",
          missingUrl: "このページのURLを取得できませんでした",
          pageUnavailable: "このページではQRコードを表示できませんでした",
          reloadAndRetry:
            "ページを再読み込みしてから、もう一度お試しください。",
          unavailableTitle: "QRコードを表示できません",
        },
        runtime: {
          actionFailed: "アクションの実行に失敗しました",
          actionFailedTitle: "{{title}}に失敗しました",
          actionMissing:
            "アクションが見つかりません（ポップアップで再保存してください）",
          chatFailed: "チャット応答に失敗しました",
          eventSummaryFailed: "イベント要約に失敗しました",
          openSettingsFailed: "設定画面を開けませんでした",
          summarizeFailed: "要約に失敗しました",
          tokenHint:
            "OpenAI API Tokenが未設定の場合は、拡張機能のポップアップ「設定」タブで設定してください。",
          tokenTestFailed: "トークン確認に失敗しました",
          unknownAction: "不明なアクションです",
        },
        storage: {
          quotaFallbackMessage:
            "設定データが多すぎます。同期されないローカルストレージに保存されました。",
          quotaMessage:
            "設定データが大きすぎます ({{key}}: {{sizeKB}}KB)。同期されないローカルストレージに保存されました。",
          quotaTitle: "ストレージ制限",
        },
      },
      calendarPane: {
        description:
          "選択範囲があれば優先し、なければページ本文からイベントを抽出します。",
        errors: {
          calendarUrlMissing: "カレンダーリンクが見つかりません",
          clipboardUnavailable: "この環境ではクリップボードにコピーできません",
          copyFailed: "コピーに失敗しました",
          googleCalendarUrlFailed: "Googleカレンダーリンクを生成できません",
          icsDownloadFailed: ".ics のダウンロードに失敗しました",
          icsGenerationFailed: ".ics の生成に失敗しました",
          saveFailed: "保存に失敗しました",
          targetRequired: "登録先を1つ以上選択してください",
        },
        eventOutputTitle: "イベント内容",
        googleCalendar: "Googleカレンダー",
        openSettings: "→ 設定を開く",
        outputTitle: "出力",
        run: "抽出する",
        running: "抽出中...",
        success: {
          completed: "完了しました",
          copied: "コピーしました",
          downloaded: "ダウンロードしました",
          saved: "保存しました",
        },
        target: "登録先",
        title: "カレンダー登録",
      },
      clipboard: {
        errors: {
          copyFailed: "コピーに失敗しました",
          emptyContent: "コピーする内容がありません",
          unavailable: "この環境ではクリップボードにコピーできません",
          unknown: "不明なエラーが発生しました",
        },
      },
      common: {
        add: "追加",
        cancel: "キャンセル",
        close: "閉じる",
        copy: "コピー",
        delete: "削除",
        dragToReorder: "ドラッグして並び替え",
        edit: "編集",
        resetToDefaults: "デフォルトに戻す",
        save: "保存",
        unknownError: "不明なエラー",
      },
      content: {
        messageHandlers: {
          copyFailed: "コピーに失敗しました",
          pasteTemplateFailed: "テンプレートの貼り付けに失敗しました",
        },
        overlay: {
          chatFailed: "チャット応答に失敗しました",
          chatResponseFailed: "応答の取得に失敗しました",
          errorPrefix: "エラー: {{message}}",
        },
        summaryTarget: {
          omitted: "(以下略)",
        },
      },
      contextMenu: {
        batchSearch: "まとめて検索",
        calendar: "カレンダー登録",
        copyTitleLink: "タイトルとリンクをコピー",
        geminiResearch: "Geminiで要約",
        qrCode: "QRコードを表示",
        search: "検索",
        settings: "設定",
        templates: "テンプレートを貼り付け",
      },
      createLink: {
        copy: "コピー",
        description:
          "現在のタブのURLを各形式でコピーします（タイトル/URLは編集できます）。",
        errors: {
          clipboardUnavailable: "この環境ではクリップボードにコピーできません",
          copyFailed: "コピーに失敗しました",
          emptyContent: "コピーする内容がありません",
          emptyUrl: "URLが空です",
          formatSave: "形式の保存に失敗しました",
          qrGeneration: "QRコードの生成に失敗しました",
        },
        fields: {
          format: "形式",
          title: "タイトル",
          url: "URL",
        },
        panels: {
          preview: "プレビュー",
          qrCode: "QRコード",
        },
        qrCode: "QRコード",
        success: {
          copied: "コピーしました",
        },
        title: "リンク作成",
      },
      debug: {
        clear: "クリア",
        description: "開発者向けのデバッグ機能です",
        disabledDescription:
          "OFFの場合は、通常のconsole.logのように動作します。",
        download: "ダウンロード",
        emptyLogs: "(ログが空です)",
        enabledDescription:
          "ONにすると、デバッグログをストレージに保存しファイルとしてダウンロードできます。",
        errors: {
          loadFailed: "ログの読み込みに失敗しました",
          saveFailed: "保存に失敗しました",
        },
        logActions: "ログ操作",
        logContent: "ログ内容",
        mode: "デバッグモード",
        modeToggle: "デバッグモードを有効にする",
        showLogs: "ログを表示",
        stats:
          "現在のログエントリ数: {{entryCount}} / 1000 (サイズ: {{sizeKB}}KB)",
        success: {
          cleared: "クリアしました",
          downloaded: "ダウンロードしました",
          saved: "保存しました",
        },
        title: "デバッグ",
      },
      history: {
        clearAll: "全削除",
        description: "直近20件のアクション実行結果を保存します。",
        empty: "履歴がありません",
        errors: {
          clearFailed: "履歴の削除に失敗しました",
          copyFailed: "コピーに失敗しました",
        },
        success: {
          cleared: "履歴を削除しました",
          copied: "コピーしました",
        },
        title: "アクション履歴",
      },
      linkFormat: {
        bbcode: "BBCode",
        html: "HTML <a>",
        markdown: "Markdown",
        org: "Org-mode",
        text: "テキスト（タイトル + URL）",
        url: "URL",
      },
      navigation: {
        actions: "アクション",
        calendar: "カレンダー登録",
        createLink: "リンク作成",
        debug: "デバッグ",
        history: "履歴",
        historyAria: "アクション履歴",
        searchEngines: "検索エンジン",
        searchGroups: "まとめて検索",
        settings: "設定",
        table: "サイト別機能",
        templates: "テンプレート",
      },
      notifications: {
        copyFailed: "コピーに失敗しました",
        copySuccess: "コピーしました",
        downloadFailed: "ダウンロードに失敗しました",
        downloadSuccess: "ダウンロードしました",
      },
      overlay: {
        actions: {
          copy: "コピー",
          openGoogleCalendar: "Googleカレンダーに登録",
          openSettings: "設定を開く",
        },
        chat: {
          assistant: "AI",
          jumpToLatest: "最新の応答へ移動",
          placeholder: "フォローアップの質問を入力（Enter で送信）",
          send: "フォローアップを送信",
          thinking: "考え中...",
          transcriptLabel: "フォローアップの会話履歴",
          user: "あなた",
        },
        close: {
          description: "オーバーレイを閉じます。",
        },
        event: {
          fields: {
            datetime: "日時",
            description: "概要",
            location: "場所",
            title: "タイトル",
          },
        },
        fallback: {
          emptyResult: "結果が空でした",
          failed: "処理に失敗しました",
        },
        hints: {
          openAiTokenMissing:
            "OpenAI API Token未設定の場合は、拡張機能のポップアップ「設定」タブで設定してください。",
          processingMayTakeSeconds: "処理に数秒かかることがあります。",
        },
        markdown: {
          description: "Markdown表示とシンプル表示を切り替えます。",
          title: "表示切り替え",
          toMarkdown: "Markdown表示に切り替え",
          toSimple: "シンプル表示に切り替え",
        },
        pin: {
          description: "右上に固定します。もう一度クリックで解除。",
          pinAriaLabel: "右上に固定",
          title: "ピン留め",
          unpinAriaLabel: "右上固定を解除",
        },
        selectionText: "選択したテキスト",
        source: {
          page: "ページ本文",
          selection: "選択範囲",
        },
        status: {
          error: "エラー",
          loading: "処理中...",
        },
        summary: {
          empty: "要約結果が空でした",
          failed: "要約に失敗しました",
          title: "要約",
        },
        theme: {
          description: "自動・ライト・ダークを順に切り替えます。",
          title: "テーマ切り替え",
        },
      },
      popup: {
        actions: {
          invalidBackgroundResponse: "バックグラウンドの応答が不正です",
          invalidResultFormat: "結果の形式が不正です",
        },
        summaryTarget: {
          activeTabMissing: "有効なタブが見つかりません",
          fetchFailed: "対象テキストの取得に失敗しました",
        },
        tokenGuard: {
          loadFailed: "AI設定の読み込みに失敗しました。",
          missingToken: "API Tokenが未設定です",
          openSettings: "→ 設定を開く",
        },
      },
      qrCodeOverlay: {
        close: "閉じる",
        errors: {
          generation: "QRコードの生成に失敗しました",
        },
        title: "QRコード",
      },
      searchEngines: {
        description: "選択したテキストを検索エンジンで検索できます。",
        empty: "検索エンジンが登録されていません",
        enableAria: "{{name}}を有効化",
        encoding: "エンコーディング",
        errors: {
          addFailed: "追加に失敗しました",
          deleteFailed: "削除に失敗しました",
          max: "検索エンジンは最大{{count}}個までです",
          nameRequired: "検索エンジン名を入力してください",
          queryRequired: "URLテンプレートに {query} を含めてください",
          reorderFailed: "並び替えの保存に失敗しました",
          resetFailed: "リセットに失敗しました",
          saveFailed: "保存に失敗しました",
          urlTemplateRequired: "URLテンプレートを入力してください",
        },
        info: {
          duplicate: "既に同じ名前の検索エンジンが存在します",
        },
        namePlaceholder: "検索エンジン名（例: Google）",
        success: {
          added: "追加しました",
          deleted: "削除しました",
          reordered: "並び替えを保存しました",
          reset: "デフォルトに戻しました",
        },
        title: "検索エンジン",
        urlTemplateHint:
          "URLテンプレートには {{query}} を含めてください。必要に応じて {url} と {title} も使えます。",
      },
      searchGroups: {
        cancelName: "取消",
        collapseAria: "{{name}}を折りたたみ",
        description: "複数の検索エンジンをまとめて実行できます。",
        editAria: "{{name}}を編集",
        empty: "グループが登録されていません",
        enableAria: "{{name}}を有効化",
        errors: {
          addFailed: "追加に失敗しました",
          deleteFailed: "削除に失敗しました",
          enginesNotLoaded: "検索エンジンが読み込まれていません",
          max: "グループは最大{{count}}個までです",
          minEngine: "少なくとも1つの検索エンジンが必要です",
          nameRequired: "グループ名を入力してください",
          reorderFailed: "並び替えの保存に失敗しました",
          resetFailed: "リセットに失敗しました",
          saveFailed: "保存に失敗しました",
          updateFailed: "更新に失敗しました",
        },
        example:
          "例: 「お買い物」グループでAmazon、楽天、ビックカメラ、ヨドバシを一括検索",
        expandAria: "{{name}}を展開",
        includeEngineAria: "{{group}}に{{engine}}を含める",
        info: {
          duplicate: "既に同じ名前のグループが存在します",
        },
        namePlaceholder: "グループ名（例: お買い物）",
        saveName: "保存",
        success: {
          added: "追加しました",
          deleted: "削除しました",
          reordered: "並び替えを保存しました",
          reset: "デフォルトに戻しました",
        },
        title: "まとめて検索",
      },
      settings: {
        apiToken: "{{provider}} API トークン",
        customPrompt: "追加指示",
        customPromptLegend: "追加指示（オプション）",
        description: "AI設定はこの端末のみ（同期されません）",
        errors: {
          deleteFailed: "削除に失敗しました",
          invalidBackgroundResponse: "バックグラウンドの応答が不正です",
          saveFailed: "保存に失敗しました",
        },
        hideToken: "トークンを隠す",
        model: "モデル",
        provider: "AIプロバイダー",
        showToken: "トークンを表示する",
        success: {
          deleted: "削除しました",
          saved: "保存しました",
          tokenOk: "トークンOK",
        },
        testToken: "トークン確認",
        theme: "テーマ",
        title: "設定",
        token: "トークン",
      },
      sidebar: {
        menu: "メニュー",
      },
      tablePane: {
        diagnostic: {
          defaultDescription:
            "現在のタブにフォーカス維持が必要かどうかを確認できます",
          descriptions: {
            active: "このタブではフォーカス維持が反映済みです",
            failed: "フォーカス維持の診断に失敗しました",
            noMatch: "現在のタブのURLは登録済みパターンに一致しません",
            noPatterns: "まだフォーカス維持パターンが登録されていません",
            reloadRequired:
              "登録は一致していますが、まだ反映前です。再読み込みで確実に反映されます",
            urlUnavailable: "現在のタブのURLを確認できませんでした",
          },
          eyebrow: "現在のタブ診断",
          labels: {
            active: "有効",
            notConfigured: "未設定",
            reloadRequired: "要リロード",
            unavailable: "判定不可",
          },
          loading: "現在のタブを診断中です…",
          matchedPattern: "一致パターン: {{pattern}}",
          notifications: {
            active: "フォーカス維持は有効です",
            notConfigured: "現在のタブはフォーカス維持の対象外です",
            reloadRequired: "現在のタブでは再読み込みで反映されます",
          },
          pendingUrl: "現在のURLを確認しています",
          refresh: "再診断",
          reload: "このタブを再読み込み",
        },
        empty: {
          patterns: "まだパターンが登録されていません",
        },
        enableCurrentTab: "このタブで有効化",
        errors: {
          activeTabMissing: "有効なタブが見つかりません",
          addFailed: "追加に失敗しました",
          deleteFailed: "削除に失敗しました",
          patternRequired: "パターンを入力してください",
          reloadTabMissing: "再読み込みできるタブが見つかりません",
          saveFailed: "保存に失敗しました",
        },
        focus: {
          description:
            "タブが非アクティブでも常に表示中として扱わせたいサイト向けです",
          listAria: "フォーカス維持の登録済みパターン",
          reloadHint:
            "パターン追加後、現在のタブが対象なら再読み込みで確実に反映されます",
          title: "フォーカス維持",
        },
        info: {
          duplicate: "既に追加されています",
        },
        rowFilter: {
          aria: "{{pattern}}の行フィルタリング",
          tooltip: "0円・ハイフン・空白・N/A の行を非表示にします",
        },
        success: {
          added: "追加しました",
          addedReload: "追加しました。このタブでは再読み込みで反映されます",
          deleted: "削除しました",
          enabled: "テーブルソートを有効化しました",
          reloaded: "このタブを再読み込みしました",
        },
        summary: {
          description:
            "自動ソート対象サイトごとの行フィルタと、フォーカス維持の一致状況をこの画面で管理します。",
          focus: "フォーカス維持",
          focusDescription:
            "現在のタブを確認するとフォーカス維持の一致状況を表示します",
          notRegistered: "まだ登録されていません",
          pending: "診断待ち",
          registeredCount: "{{count}}件を登録済み",
          title: "このタブに必要な設定をまとめて確認できます",
          urlPatterns: "自動ソート対象サイト",
          urlPatternsMeta: "* ワイルドカード対応 / protocolは無視",
        },
        title: "サイト別機能",
        urlPatterns: {
          description:
            "テーブルの自動ソートを有効にしたいサイトを URL パターンで登録できます。行フィルタはサイトごとに有効化できます。",
          listAria: "登録済みパターン",
          title: "自動ソート対象サイト",
        },
      },
      tableSort: {
        enabledCount: "{{count}}個のテーブルでソートを有効化しました",
        headerTitle: "クリックでソート",
        newTablesEnabledCount:
          "{{count}}個の新しいテーブルでソートを有効化しました",
      },
      templates: {
        copyFallbackSuccess: "テンプレートをコピーしました",
      },
      templatesPane: {
        contentPlaceholder: "内容（例: LGTM :+1:）",
        description: "右クリックメニューから定型文を貼り付けられます。",
        empty: "テンプレートが登録されていません",
        errors: {
          contentRequired: "内容を入力してください",
          deleteFailed: "削除に失敗しました",
          duplicateTitle: "既に同じタイトルのテンプレートが存在します",
          reorderFailed: "並び替えの保存に失敗しました",
          resetFailed: "リセットに失敗しました",
          saveFailed: "保存に失敗しました",
          targetNotFound: "編集対象が見つかりません",
          titleRequired: "タイトルを入力してください",
        },
        hiddenDescription:
          "非表示にしたテンプレートはメニューに表示されません。",
        new: "新規追加",
        success: {
          added: "追加しました",
          deleted: "削除しました",
          reordered: "並び替えを保存しました",
          reset: "デフォルトに戻しました",
          updated: "更新しました",
        },
        title: "テキストテンプレート",
        titlePlaceholder: "タイトル（例: LGTM）",
        visibleAria: "{{title}}を表示",
      },
      theme: {
        auto: "自動",
        buttonLabel: "テーマ: {{current}}（クリックで{{next}}へ）",
        dark: "ダーク",
        light: "ライト",
      },
    },
  },
} as const;
