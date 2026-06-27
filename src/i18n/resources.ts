export const resources = {
  ja: {
    translation: {
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
        cancel: "キャンセル",
        close: "閉じる",
        copy: "コピー",
        delete: "削除",
        edit: "編集",
        dragToReorder: "ドラッグして並び替え",
        resetToDefaults: "デフォルトに戻す",
        save: "保存",
        unknownError: "不明なエラー",
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
          transcriptLabel: "フォローアップの会話履歴",
          send: "フォローアップを送信",
          jumpToLatest: "最新の応答へ移動",
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
        title: "Context Actions",
        templateVars: "テンプレ変数:",
        reorder: {
          title: "並び順編集",
          description:
            "ドラッグ&ドロップで並び替えできます。右クリックメニューの順序に反映されます。",
          empty: "アクションがありません",
          saved: "並び替えを保存しました",
          saveFailed: "並び替えの保存に失敗しました",
        },
        kind: {
          text: "テキスト",
          event: "イベント",
        },
        editor: {
          title: "アクション編集",
          target: "対象",
          titleField: "タイトル",
          kind: "種類",
          prompt: "プロンプト",
          newAction: "新規作成",
          clear: "クリア",
          eventHelpAria: "eventとは",
          eventHelpTitle: "event とは",
          eventHelpDescription:
            "event は日時・場所・概要などを抽出してイベント形式で返すモードです。 text はプロンプトに従って要約/翻訳などを行います。",
        },
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
          saved: "保存しました",
          deleted: "削除しました",
          reset: "リセットしました",
        },
        errors: {
          notFound: "アクションが見つかりません",
          titleRequired: "タイトルを入力してください",
          promptRequired: "プロンプトを入力してください",
          saveFailed: "保存に失敗しました",
          deleteFailed: "削除に失敗しました",
          resetFailed: "リセットに失敗しました",
        },
      },
      searchEngines: {
        title: "検索エンジン",
        description: "選択したテキストを検索エンジンで検索できます。",
        urlTemplateHint:
          "URLテンプレートには {{query}} を含めてください。必要に応じて {url} と {title} も使えます。",
        namePlaceholder: "検索エンジン名（例: Google）",
        encoding: "エンコーディング",
        empty: "検索エンジンが登録されていません",
        enableAria: "{{name}}を有効化",
        errors: {
          nameRequired: "検索エンジン名を入力してください",
          urlTemplateRequired: "URLテンプレートを入力してください",
          queryRequired: "URLテンプレートに {query} を含めてください",
          max: "検索エンジンは最大{{count}}個までです",
          saveFailed: "保存に失敗しました",
          addFailed: "追加に失敗しました",
          deleteFailed: "削除に失敗しました",
          resetFailed: "リセットに失敗しました",
          reorderFailed: "並び替えの保存に失敗しました",
        },
        info: {
          duplicate: "既に同じ名前の検索エンジンが存在します",
        },
        success: {
          added: "追加しました",
          deleted: "削除しました",
          reset: "デフォルトに戻しました",
          reordered: "並び替えを保存しました",
        },
      },
      searchGroups: {
        title: "まとめて検索",
        description: "複数の検索エンジンをまとめて実行できます。",
        example:
          "例: 「お買い物」グループでAmazon、楽天、ビックカメラ、ヨドバシを一括検索",
        namePlaceholder: "グループ名（例: お買い物）",
        empty: "グループが登録されていません",
        saveName: "保存",
        cancelName: "取消",
        includeEngineAria: "{{group}}に{{engine}}を含める",
        enableAria: "{{name}}を有効化",
        editAria: "{{name}}を編集",
        expandAria: "{{name}}を展開",
        collapseAria: "{{name}}を折りたたみ",
        errors: {
          nameRequired: "グループ名を入力してください",
          saveFailed: "保存に失敗しました",
          updateFailed: "更新に失敗しました",
          minEngine: "少なくとも1つの検索エンジンが必要です",
          enginesNotLoaded: "検索エンジンが読み込まれていません",
          max: "グループは最大{{count}}個までです",
          addFailed: "追加に失敗しました",
          deleteFailed: "削除に失敗しました",
          resetFailed: "リセットに失敗しました",
          reorderFailed: "並び替えの保存に失敗しました",
        },
        info: {
          duplicate: "既に同じ名前のグループが存在します",
        },
        success: {
          added: "追加しました",
          deleted: "削除しました",
          reset: "デフォルトに戻しました",
          reordered: "並び替えを保存しました",
        },
      },
      settings: {
        title: "設定",
        description: "AI設定はこの端末のみ（同期されません）",
        provider: "AIプロバイダー",
        apiToken: "{{provider}} API トークン",
        token: "トークン",
        showToken: "トークンを表示する",
        hideToken: "トークンを隠す",
        testToken: "トークン確認",
        model: "モデル",
        customPrompt: "追加指示",
        customPromptLegend: "追加指示（オプション）",
        theme: "テーマ",
        success: {
          saved: "保存しました",
          deleted: "削除しました",
          tokenOk: "トークンOK",
        },
        errors: {
          saveFailed: "保存に失敗しました",
          deleteFailed: "削除に失敗しました",
          invalidBackgroundResponse: "バックグラウンドの応答が不正です",
        },
      },
      templatesPane: {
        title: "テキストテンプレート",
        description: "右クリックメニューから定型文を貼り付けられます。",
        hiddenDescription:
          "非表示にしたテンプレートはメニューに表示されません。",
        titlePlaceholder: "タイトル（例: LGTM）",
        contentPlaceholder: "内容（例: LGTM :+1:）",
        new: "新規追加",
        visibleAria: "{{title}}を表示",
        empty: "テンプレートが登録されていません",
        errors: {
          saveFailed: "保存に失敗しました",
          titleRequired: "タイトルを入力してください",
          contentRequired: "内容を入力してください",
          targetNotFound: "編集対象が見つかりません",
          duplicateTitle: "既に同じタイトルのテンプレートが存在します",
          deleteFailed: "削除に失敗しました",
          resetFailed: "リセットに失敗しました",
          reorderFailed: "並び替えの保存に失敗しました",
        },
        success: {
          added: "追加しました",
          updated: "更新しました",
          deleted: "削除しました",
          reset: "デフォルトに戻しました",
          reordered: "並び替えを保存しました",
        },
      },
      calendarPane: {
        title: "カレンダー登録",
        description:
          "選択範囲があれば優先し、なければページ本文からイベントを抽出します。",
        outputTitle: "出力",
        eventOutputTitle: "イベント内容",
        running: "抽出中...",
        target: "登録先",
        googleCalendar: "Googleカレンダー",
        run: "抽出する",
        openSettings: "→ 設定を開く",
        success: {
          saved: "保存しました",
          completed: "完了しました",
          copied: "コピーしました",
          downloaded: "ダウンロードしました",
        },
        errors: {
          saveFailed: "保存に失敗しました",
          targetRequired: "登録先を1つ以上選択してください",
          googleCalendarUrlFailed: "Googleカレンダーリンクを生成できません",
          clipboardUnavailable: "この環境ではクリップボードにコピーできません",
          copyFailed: "コピーに失敗しました",
          calendarUrlMissing: "カレンダーリンクが見つかりません",
          icsGenerationFailed: ".ics の生成に失敗しました",
          icsDownloadFailed: ".ics のダウンロードに失敗しました",
        },
      },
      debug: {
        title: "デバッグ",
        description: "開発者向けのデバッグ機能です",
        mode: "デバッグモード",
        modeToggle: "デバッグモードを有効にする",
        enabledDescription:
          "ONにすると、デバッグログをストレージに保存しファイルとしてダウンロードできます。",
        disabledDescription:
          "OFFの場合は、通常のconsole.logのように動作します。",
        stats:
          "現在のログエントリ数: {{entryCount}} / 1000 (サイズ: {{sizeKB}}KB)",
        logActions: "ログ操作",
        showLogs: "ログを表示",
        download: "ダウンロード",
        clear: "クリア",
        logContent: "ログ内容",
        emptyLogs: "(ログが空です)",
        success: {
          saved: "保存しました",
          downloaded: "ダウンロードしました",
          cleared: "クリアしました",
        },
        errors: {
          saveFailed: "保存に失敗しました",
          loadFailed: "ログの読み込みに失敗しました",
        },
      },
      tablePane: {
        title: "サイト別機能",
        enableCurrentTab: "このタブで有効化",
        summary: {
          title: "このタブに必要な設定をまとめて確認できます",
          description:
            "自動ソート対象サイトごとの行フィルタと、フォーカス維持の一致状況をこの画面で管理します。",
          urlPatterns: "自動ソート対象サイト",
          urlPatternsMeta: "* ワイルドカード対応 / protocolは無視",
          focus: "フォーカス維持",
          pending: "診断待ち",
          notRegistered: "まだ登録されていません",
          registeredCount: "{{count}}件を登録済み",
          focusDescription:
            "現在のタブを確認するとフォーカス維持の一致状況を表示します",
        },
        diagnostic: {
          eyebrow: "現在のタブ診断",
          pendingUrl: "現在のURLを確認しています",
          refresh: "再診断",
          reload: "このタブを再読み込み",
          defaultDescription:
            "現在のタブにフォーカス維持が必要かどうかを確認できます",
          matchedPattern: "一致パターン: {{pattern}}",
          loading: "現在のタブを診断中です…",
          labels: {
            notConfigured: "未設定",
            active: "有効",
            reloadRequired: "要リロード",
            unavailable: "判定不可",
          },
          descriptions: {
            urlUnavailable: "現在のタブのURLを確認できませんでした",
            noPatterns: "まだフォーカス維持パターンが登録されていません",
            noMatch: "現在のタブのURLは登録済みパターンに一致しません",
            active: "このタブではフォーカス維持が反映済みです",
            reloadRequired:
              "登録は一致していますが、まだ反映前です。再読み込みで確実に反映されます",
            failed: "フォーカス維持の診断に失敗しました",
          },
          notifications: {
            active: "フォーカス維持は有効です",
            reloadRequired: "現在のタブでは再読み込みで反映されます",
            notConfigured: "現在のタブはフォーカス維持の対象外です",
          },
        },
        rowFilter: {
          tooltip: "0円・ハイフン・空白・N/A の行を非表示にします",
          aria: "{{pattern}}の行フィルタリング",
        },
        urlPatterns: {
          title: "自動ソート対象サイト",
          description:
            "テーブルの自動ソートを有効にしたいサイトを URL パターンで登録できます。行フィルタはサイトごとに有効化できます。",
          listAria: "登録済みパターン",
        },
        focus: {
          title: "フォーカス維持",
          description:
            "タブが非アクティブでも常に表示中として扱わせたいサイト向けです",
          reloadHint:
            "パターン追加後、現在のタブが対象なら再読み込みで確実に反映されます",
          listAria: "フォーカス維持の登録済みパターン",
        },
        empty: {
          patterns: "まだパターンが登録されていません",
        },
        success: {
          enabled: "テーブルソートを有効化しました",
          added: "追加しました",
          addedReload: "追加しました。このタブでは再読み込みで反映されます",
          deleted: "削除しました",
          reloaded: "このタブを再読み込みしました",
        },
        info: {
          duplicate: "既に追加されています",
        },
        errors: {
          activeTabMissing: "有効なタブが見つかりません",
          saveFailed: "保存に失敗しました",
          patternRequired: "パターンを入力してください",
          addFailed: "追加に失敗しました",
          deleteFailed: "削除に失敗しました",
          reloadTabMissing: "再読み込みできるタブが見つかりません",
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
        copyTitleLink: {
          title: "タイトルとリンクをコピー",
          fallbackSecondary:
            "自動コピーに失敗しました。上のボタンでコピーしてください。",
          emptyContent: "コピーする内容がありません",
          copied: "コピーしました",
          copyFailed: "コピーに失敗しました",
          fallbackHint: "ポップアップの「リンク作成」タブからコピーできます。",
          fallbackPage: "このページ",
          badgeTitle:
            "{{appName}}: このページではコピーできません\n{{pageLabel}}\n（ポップアップ「リンク作成」からコピーできます）",
        },
        runtime: {
          actionFailedTitle: "{{title}}に失敗しました",
          tokenHint:
            "OpenAI API Tokenが未設定の場合は、拡張機能のポップアップ「設定」タブで設定してください。",
          summarizeFailed: "要約に失敗しました",
          actionMissing:
            "アクションが見つかりません（ポップアップで再保存してください）",
          actionFailed: "アクションの実行に失敗しました",
          tokenTestFailed: "トークン確認に失敗しました",
          eventSummaryFailed: "イベント要約に失敗しました",
          openSettingsFailed: "設定画面を開けませんでした",
          chatFailed: "チャット応答に失敗しました",
        },
        contextActions: {
          selectionPrefix: "選択範囲:\n{{text}}",
          source: {
            selection: "選択範囲",
            page: "ページ本文",
          },
          actionMissing:
            "アクションが見つかりません（ポップアップで再保存してください）",
          actionFailedTitle: "{{title}}に失敗しました",
          summarizeFailed: "要約に失敗しました",
          calendarInitialTitle: "カレンダー登録（{{source}}）",
          calendarFailedTitle: "カレンダー登録に失敗しました",
          calendarTargetMissing:
            "カレンダー登録先が未選択です（ポップアップの「カレンダー」タブで設定してください）",
        },
        geminiResearch: {
          copyFallbackSuccess:
            "Geminiへの自動入力に失敗したため、プロンプトをコピーしました",
        },
        messaging: {
          pageUnavailable: "このページでは実行できません（{{message}}）",
        },
        actionExecutor: {
          emptyPrompt: "プロンプトが空です",
        },
        debug: {
          downloadFailed: "デバッグログのダウンロードに失敗しました",
          clearFailed: "デバッグログのクリアに失敗しました",
          statsFailed: "デバッグログ統計の取得に失敗しました",
          getLogsFailed: "デバッグログの取得に失敗しました",
        },
        storage: {
          quotaTitle: "ストレージ制限",
          quotaMessage:
            "設定データが大きすぎます ({{key}}: {{sizeKB}}KB)。同期されないローカルストレージに保存されました。",
          quotaFallbackMessage:
            "設定データが多すぎます。同期されないローカルストレージに保存されました。",
        },
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
      popup: {
        tokenGuard: {
          loadFailed: "AI設定の読み込みに失敗しました。",
          missingToken: "API Tokenが未設定です",
          openSettings: "→ 設定を開く",
        },
        summaryTarget: {
          fetchFailed: "対象テキストの取得に失敗しました",
          activeTabMissing: "有効なタブが見つかりません",
        },
        actions: {
          invalidBackgroundResponse: "バックグラウンドの応答が不正です",
          invalidResultFormat: "結果の形式が不正です",
        },
      },
      content: {
        messageHandlers: {
          copyFailed: "コピーに失敗しました",
          pasteTemplateFailed: "テンプレートの貼り付けに失敗しました",
        },
        summaryTarget: {
          omitted: "(以下略)",
        },
        overlay: {
          chatResponseFailed: "応答の取得に失敗しました",
          errorPrefix: "エラー: {{message}}",
          chatFailed: "チャット応答に失敗しました",
        },
      },
    },
  },
} as const;
