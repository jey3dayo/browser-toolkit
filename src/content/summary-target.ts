import { Result } from "@praha/byethrow";
import { safeParse } from "valibot";
import { SELECTED_TEXT_CACHE_TIMEOUT_MS } from "@/constants/timeouts";
import type { SummaryTarget } from "@/content-script-messages";
import { t } from "@/i18n";
import { SelectedTextCacheSchema } from "@/schemas/selected_text";
import { storageLocalGet } from "@/storage/helpers";

/**
 * テキストを正規化（改行・空白の整理）
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 選択範囲ターゲットを構築
 */
function buildSelectionTarget(text: string): SummaryTarget {
  return {
    source: "selection",
    text,
    title: document.title ?? "",
    url: window.location.href,
  };
}

/**
 * ページターゲットを構築
 */
function buildPageTarget(text: string): SummaryTarget {
  return {
    source: "page",
    text,
    title: document.title ?? "",
    url: window.location.href,
  };
}

/**
 * 現在の選択範囲からターゲットを取得
 */
function getLiveSelectionTarget(): SummaryTarget | null {
  const selection = window.getSelection()?.toString().trim() ?? "";
  if (!selection) {
    return null;
  }
  return buildSelectionTarget(selection);
}

/**
 * キャッシュされた選択範囲からターゲットを取得
 */
async function getCachedSelectionTarget(): Promise<SummaryTarget | null> {
  const result = await storageLocalGet<unknown>([
    "selectedText",
    "selectedTextOrigin",
    "selectedTextUpdatedAt",
  ]);

  if (Result.isFailure(result)) {
    return null;
  }

  const parsed = safeParse(SelectedTextCacheSchema, result.value);
  if (!parsed.success) {
    return null;
  }

  const stored = parsed.output;
  const selection = stored.selectedText?.trim() ?? "";
  const updatedAt = stored.selectedTextUpdatedAt ?? 0;
  const origin = stored.selectedTextOrigin;
  // キャッシュは書き込んだページの origin 固定。別 origin のタブでは
  // 無関係ページのテキストが title/url 付きで AI に送られるのを防ぐ
  const isFresh = Date.now() - updatedAt <= SELECTED_TEXT_CACHE_TIMEOUT_MS;
  if (!(isFresh && selection && origin && origin === window.location.origin)) {
    return null;
  }
  return buildSelectionTarget(selection);
}

/**
 * 要約対象テキストを取得
 * @param options - オプション
 * @returns SummaryTarget
 */
export async function getSummaryTargetText(options?: {
  ignoreSelection?: boolean;
}): Promise<SummaryTarget> {
  if (!options?.ignoreSelection) {
    const selectionTarget = getLiveSelectionTarget();
    if (selectionTarget) {
      return selectionTarget;
    }
    const cachedSelectionTarget = await getCachedSelectionTarget();
    if (cachedSelectionTarget) {
      return cachedSelectionTarget;
    }
  }

  const bodyText = document.body?.innerText ?? "";
  const MAX_RETURN_CHARS = 60_000;
  const normalized = normalizeText(bodyText);
  const clipped =
    normalized.length > MAX_RETURN_CHARS
      ? `${normalized.slice(0, MAX_RETURN_CHARS)}\n\n${t(
          "content.summaryTarget.omitted"
        )}`
      : normalized;
  return buildPageTarget(clipped);
}
