import { Result } from "@praha/byethrow";
import { storageLocalGetTyped } from "@/background/storage";
import type { SummaryTarget } from "@/background/types";
import { loadOpenAiSettings, type OpenAiSettings } from "@/openai/settings";

const MAX_INPUT_CHARS = 20_000;

/**
 * 入力テキストを最大文字数に制限
 */
export function clipInputText(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= MAX_INPUT_CHARS) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_INPUT_CHARS)}\n\n(以下略)`;
}

/**
 * タイトルとURLのメタ情報を構築
 */
export function buildTitleUrlMeta(
  target: SummaryTarget,
  options?: { includeMissing?: boolean }
): string {
  const title = target.title?.trim() || "";
  const url = target.url?.trim() || "";

  if (!(title || url)) {
    return "";
  }

  if (options?.includeMissing) {
    return `\n\n---\nタイトル: ${title || "-"}\nURL: ${url || "-"}`;
  }

  const metaLines: string[] = [];
  if (title) {
    metaLines.push(`タイトル: ${title}`);
  }
  if (url) {
    metaLines.push(`URL: ${url}`);
  }
  return metaLines.length > 0 ? `\n\n---\n${metaLines.join("\n")}` : "";
}

/**
 * テンプレート変数を適用
 */
export function applyTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.split(`{{${key}}}`).join(value);
  }
  return rendered;
}

/**
 * OpenAI入力の準備済みデータ
 */
export type PreparedOpenAiInput = {
  settings: OpenAiSettings;
  clippedText: string;
  meta: string;
};

/**
 * OpenAI呼び出しのための入力を準備
 */
export async function prepareOpenAiInput(params: {
  target: SummaryTarget;
  missingTextMessage: string;
  includeMissingMeta?: boolean;
}): Promise<Result.Result<PreparedOpenAiInput, string>> {
  const settingsResult = await loadOpenAiSettings(storageLocalGetTyped);
  if (Result.isFailure(settingsResult)) {
    return Result.fail(settingsResult.error);
  }
  const settings = settingsResult.value;

  const clippedText = clipInputText(params.target.text);
  if (!clippedText) {
    return Result.fail(params.missingTextMessage);
  }

  const meta = buildTitleUrlMeta(params.target, {
    includeMissing: params.includeMissingMeta,
  });

  return Result.succeed({ settings, clippedText, meta });
}

/**
 * システムメッセージを構築（カスタムプロンプトを含む）
 */
export function buildSystemMessage(
  baseContent: string,
  customPrompt?: string,
  extraInstruction?: string
): string {
  const parts = [baseContent];

  if (customPrompt?.trim()) {
    parts.push(`\n\nユーザーの追加指示:\n${customPrompt.trim()}`);
  }

  if (extraInstruction?.trim()) {
    parts.push(`\n\nこのアクションの追加指示:\n${extraInstruction.trim()}`);
  }

  return parts.join("").trim();
}
