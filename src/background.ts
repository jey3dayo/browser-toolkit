// Background Service Worker

type SummarySource = "selection" | "page";

type SummaryTarget = {
  text: string;
  source: SummarySource;
  title?: string;
  url?: string;
};

type ContentScriptMessage =
  | { action: "showNotification"; message: string }
  | { action: "getSummaryTargetText" }
  | { action: "showSummaryOverlay"; summary: string; source: SummarySource };

type BackgroundRequest = { action: "summarizeTab"; tabId: number };

type BackgroundResponse =
  | { ok: true; summary: string; source: SummarySource }
  | { ok: false; error: string };

type LocalStorageData = {
  openaiApiToken?: string;
};

const CONTEXT_MENU_ID = "ai-summarize";

chrome.runtime.onInstalled.addListener(() => {
  console.log("My Browser Utils installed");

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "ページ/選択範囲を要約",
      contexts: ["page", "selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(
  (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;

    const tabId = tab?.id;
    if (tabId === undefined) {
      return;
    }

    void (async () => {
      await sendMessageToTab(tabId, {
        action: "showNotification",
        message: "要約中...",
      });

      const selection = info.selectionText?.trim() ?? "";
      const target: SummaryTarget = selection
        ? {
            text: selection,
            source: "selection",
            title: tab?.title,
            url: tab?.url,
          }
        : await sendMessageToTab(tabId, { action: "getSummaryTargetText" });

      const result = await summarizeWithOpenAI(target);
      if (!result.ok) {
        await sendMessageToTab(tabId, {
          action: "showNotification",
          message: result.error,
        });
        return;
      }

      await sendMessageToTab(tabId, {
        action: "showSummaryOverlay",
        summary: result.summary,
        source: result.source,
      });
    })();
  },
);

chrome.runtime.onMessage.addListener(
  (
    request: BackgroundRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: BackgroundResponse) => void,
  ) => {
    if (request.action === "summarizeTab") {
      void (async () => {
        try {
          const target = await sendMessageToTab<
            ContentScriptMessage,
            SummaryTarget
          >(request.tabId, { action: "getSummaryTargetText" });

          const result = await summarizeWithOpenAI(target);
          sendResponse(result);
        } catch (error) {
          sendResponse({
            ok: false,
            error:
              error instanceof Error ? error.message : "要約に失敗しました",
          });
        }
      })();
      return true;
    }

    return true;
  },
);

function sendMessageToTab<TRequest, TResponse>(
  tabId: number,
  message: TRequest,
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: TResponse) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(`このページでは実行できません（${err.message}）`));
        return;
      }
      resolve(response);
    });
  });
}

async function summarizeWithOpenAI(
  target: SummaryTarget,
): Promise<BackgroundResponse> {
  const { openaiApiToken } = (await chrome.storage.local.get([
    "openaiApiToken",
  ])) as LocalStorageData;

  if (!openaiApiToken) {
    return {
      ok: false,
      error:
        "OpenAI API Tokenが未設定です（ポップアップの「設定」タブで設定してください）",
    };
  }

  const MAX_INPUT_CHARS = 20000;
  const rawText = target.text.trim();
  if (!rawText) {
    return { ok: false, error: "要約対象のテキストが見つかりませんでした" };
  }

  const clippedText =
    rawText.length > MAX_INPUT_CHARS
      ? `${rawText.slice(0, MAX_INPUT_CHARS)}\n\n(以下略)`
      : rawText;

  const meta =
    target.title || target.url
      ? `\n\n---\nタイトル: ${target.title ?? "-"}\nURL: ${target.url ?? "-"}`
      : "";

  const body = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "あなたは日本語の要約アシスタントです。入力テキストを読み、要点を短く整理して出力してください。",
      },
      {
        role: "user",
        content: [
          "次のテキストを日本語で要約してください。",
          "",
          "要件:",
          "- 重要ポイントを箇条書き(3〜7個)",
          "- 最後に一文で結論/要約",
          "- 事実と推測を混同しない",
          "",
          clippedText + meta,
        ].join("\n"),
      },
    ],
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: unknown }).error === "object" &&
      (json as { error: { message?: unknown } }).error !== null &&
      typeof (json as { error: { message?: unknown } }).error.message ===
        "string"
        ? (json as { error: { message: string } }).error.message
        : `OpenAI APIエラー: ${response.status}`;
    return { ok: false, error: message };
  }

  const summary = extractChatCompletionText(json);
  if (!summary) {
    return { ok: false, error: "要約結果の取得に失敗しました" };
  }

  return { ok: true, summary, source: target.source };
}

function extractChatCompletionText(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0] as { message?: { content?: unknown } };
  const content = first?.message?.content;
  if (typeof content !== "string") return null;
  return content.trim();
}
