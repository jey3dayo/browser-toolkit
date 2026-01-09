// 要約対象テキスト取得
import { Result } from "@praha/byethrow";
import { storageLocalGet } from "@/storage/helpers";
import type { SummarySource } from "@/shared_types";

export type SummaryTarget = {
  text: string;
  source: SummarySource;
  title: string;
  url: string;
};

/**
 * テキストを正規化（改行・空白の整理）
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 選択範囲ターゲットを構築
 */
export function buildSelectionTarget(text: string): SummaryTarget {
  return {
    text,
    source: "selection",
    title: document.title ?? "",
    url: window.location.href,
  };
}

/**
 * ページターゲットを構築
 */
export function buildPageTarget(text: string): SummaryTarget {
  return {
    text,
    source: "page",
    title: document.title ?? "",
    url: window.location.href,
  };
}

/**
 * 現在の選択範囲からターゲットを取得
 */
export function getLiveSelectionTarget(): SummaryTarget | null {
  const selection = window.getSelection()?.toString().trim() ?? "";
  if (!selection) {
    return null;
  }
  return buildSelectionTarget(selection);
}

/**
 * キャッシュされた選択範囲からターゲットを取得
 */
export async function getCachedSelectionTarget(): Promise<SummaryTarget | null> {
  const result = await storageLocalGet<{
    selectedText?: string;
    selectedTextUpdatedAt?: number;
  }>(["selectedText", "selectedTextUpdatedAt"]);

  if (Result.isFailure(result)) {
    return null;
  }

  const stored = result.value;
  const selection = stored.selectedText?.trim() ?? "";
  const updatedAt = stored.selectedTextUpdatedAt ?? 0;
  const isFresh = Date.now() - updatedAt <= 30_000;
  if (!(isFresh && selection)) {
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
      ? `${normalized.slice(0, MAX_RETURN_CHARS)}\n\n(以下略)`
      : normalized;
  return buildPageTarget(clipped);
}
