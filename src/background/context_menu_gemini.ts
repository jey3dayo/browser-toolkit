import { t } from "@/i18n";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

const GEMINI_URL = "https://gemini.google.com/app";
const GEMINI_HANDOFF_RETRY_COUNT = 20;
const GEMINI_HANDOFF_RETRY_INTERVAL_MS = 500;

type GeminiHandoffArgs = {
  prompt: string;
};

export function buildGeminiResearchPrompt(args: {
  selectionText?: string | undefined;
  title?: string | undefined;
  url?: string | undefined;
}): string {
  if (!args.selectionText && args.url) {
    return buildLinkSummaryPrompt({
      title: args.title,
      url: args.url,
    });
  }

  const metadata = [
    args.title ? `ページタイトル: ${args.title}` : null,
    args.url ? `ページURL: ${args.url}` : null,
  ].filter((line): line is string => line !== null);

  return [
    "以下の内容について、多角的にWeb調査してください。",
    "一次情報や信頼できる情報源を優先し、出典URLを添えて日本語で要約してください。",
    "X/Twitter上の反応や最新動向も必要に応じて確認してください。",
    "",
    ...metadata,
    metadata.length > 0 ? "" : null,
    "調査対象:",
    args.selectionText ?? args.url ?? args.title ?? "",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function buildLinkSummaryPrompt(args: {
  title?: string | undefined;
  url: string;
}): string {
  const isYouTube = isYouTubeWatchUrl(args.url);
  return [
    isYouTube
      ? "このYouTube動画を要約してください。"
      : "このリンク先の内容を要約してください。",
    isYouTube
      ? "可能であれば動画の内容を確認し、要点、重要な発言、実用的な示唆を日本語で整理してください。"
      : "可能であればリンク先の内容を確認し、要点、背景、重要な示唆を日本語で整理してください。",
    "章立てやタイムスタンプ、見出しなどが分かる場合は、それも含めてください。",
    "",
    args.title ? `タイトル: ${args.title}` : null,
    `URL: ${args.url}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function isYouTubeWatchUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "www.youtube.com" ||
        parsed.hostname === "youtube.com" ||
        parsed.hostname === "m.youtube.com") &&
      parsed.pathname === "/watch" &&
      parsed.searchParams.has("v")
    );
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isHandoffSuccess(
  results: chrome.scripting.InjectionResult<boolean>[] | undefined
): boolean {
  return results?.some((result) => result.result === true) ?? false;
}

async function insertPromptIntoGemini(
  args: GeminiHandoffArgs
): Promise<boolean> {
  const editable = document.querySelector<HTMLElement>(
    'rich-textarea div[contenteditable="true"], div[contenteditable="true"], textarea'
  );
  if (!editable) {
    return false;
  }

  if (editable instanceof HTMLTextAreaElement) {
    editable.value = args.prompt;
  } else {
    editable.focus();
    editable.textContent = "";
    if (!document.execCommand("insertText", false, args.prompt)) {
      editable.textContent = args.prompt;
    }
  }

  editable.dispatchEvent(new InputEvent("beforeinput", { bubbles: true }));
  editable.dispatchEvent(new InputEvent("input", { bubbles: true }));
  editable.dispatchEvent(new Event("change", { bubbles: true }));

  await new Promise((resolve) => {
    setTimeout(resolve, 250);
  });

  const sendButton = document.querySelector<HTMLButtonElement>(
    'button[aria-label*="送信"], button[aria-label*="Send"], button[data-testid*="send"], button[type="submit"]'
  );
  if (sendButton && !sendButton.disabled) {
    sendButton.click();
    return true;
  }

  editable.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
    })
  );
  return true;
}

async function tryGeminiHandoff(
  tabId: number,
  prompt: string
): Promise<boolean> {
  for (let attempt = 0; attempt < GEMINI_HANDOFF_RETRY_COUNT; attempt += 1) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: insertPromptIntoGemini,
        args: [{ prompt }],
      });
      if (isHandoffSuccess(results)) {
        return true;
      }
    } catch {
      // Gemini may still be loading; retry until the handoff window expires.
    }
    await delay(GEMINI_HANDOFF_RETRY_INTERVAL_MS);
  }
  return false;
}

async function copyPromptFallback(
  sourceTabId: number,
  prompt: string
): Promise<void> {
  await chrome.tabs.sendMessage(sourceTabId, {
    action: "copyToClipboard",
    text: prompt,
    successMessage: t("background.geminiResearch.copyFallbackSuccess"),
  });
}

export async function handleGeminiResearchContextMenuClick(args: {
  info: chrome.contextMenus.OnClickData;
  tabId: number;
  tab?: chrome.tabs.Tab | undefined;
}): Promise<void> {
  const selectionText = args.info.selectionText?.trim();
  const targetUrl = args.info.linkUrl ?? args.tab?.url ?? args.info.pageUrl;
  if (!(selectionText || targetUrl)) {
    return;
  }

  const prompt = buildGeminiResearchPrompt({
    selectionText,
    title: args.tab?.title,
    url: targetUrl,
  });

  try {
    const geminiTab = await chrome.tabs.create({ url: GEMINI_URL });
    if (geminiTab.id === undefined) {
      await copyPromptFallback(args.tabId, prompt);
      return;
    }

    const success = await tryGeminiHandoff(geminiTab.id, prompt);
    if (!success) {
      await copyPromptFallback(args.tabId, prompt);
    }
  } catch (error) {
    await debugLog(
      "handleGeminiResearchContextMenuClick",
      "Gemini handoff failed",
      { error: formatErrorLog("", {}, error) },
      "error"
    );
    await copyPromptFallback(args.tabId, prompt);
  }
}
