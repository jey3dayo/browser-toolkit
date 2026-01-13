// 設定管理
import { Result } from "@praha/byethrow";
import { patternToRegex } from "@/content/url-pattern";
import type { DomainPatternConfig } from "@/popup/runtime";
import { storageSyncGet } from "@/storage/helpers";

type StorageData = {
  domainPatternConfigs?: DomainPatternConfig[];
  domainPatterns?: string[];
};

// Regex patterns at module level for performance (lint/performance/useTopLevelRegex)
const HTTP_PROTOCOL_REGEX = /^https?:\/\//;

/**
 * 新形式(domainPatternConfigs)のバリデーションと正規化
 * @param items - domainPatternConfigs配列
 * @returns 成功時はDomainPatternConfig配列、失敗時はエラーメッセージ
 */
function validateDomainPatternConfigs(
  items: unknown
): Result.Result<DomainPatternConfig[], string> {
  if (!Array.isArray(items)) {
    return Result.fail("domainPatternConfigs must be an array");
  }

  const configs: DomainPatternConfig[] = [];
  for (const item of items) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.pattern !== "string" ||
      typeof item.enableRowFilter !== "boolean"
    ) {
      return Result.fail("Invalid domainPatternConfig item format");
    }
    const pattern = item.pattern.trim();
    if (pattern) {
      configs.push({ pattern, enableRowFilter: item.enableRowFilter });
    }
  }
  return Result.succeed(configs);
}

/**
 * 旧形式(domainPatterns)のバリデーションと変換
 * @param items - domainPatterns配列
 * @returns 成功時はDomainPatternConfig配列、失敗時はエラーメッセージ
 */
function validateLegacyDomainPatterns(
  items: unknown
): Result.Result<DomainPatternConfig[], string> {
  if (!Array.isArray(items)) {
    return Result.fail("domainPatterns must be an array");
  }

  const configs: DomainPatternConfig[] = [];
  for (const patternRaw of items) {
    if (typeof patternRaw !== "string") {
      return Result.fail("Invalid domainPatterns item format");
    }
    const pattern = patternRaw.trim();
    if (pattern) {
      configs.push({ pattern, enableRowFilter: false });
    }
  }
  return Result.succeed(configs);
}

/**
 * ストレージデータからDomainPatternConfig配列を正規化する
 * @param data - ストレージデータ
 * @returns 成功時はDomainPatternConfig配列、失敗時はエラーメッセージ
 */
export function normalizeDomainPatternConfigs(
  data: StorageData
): Result.Result<DomainPatternConfig[], string> {
  // 1. 新形式(domainPatternConfigs)のバリデーション
  if (data.domainPatternConfigs !== undefined) {
    return validateDomainPatternConfigs(data.domainPatternConfigs);
  }

  // 2. 旧形式(domainPatterns)のフォールバック
  if (data.domainPatterns !== undefined) {
    return validateLegacyDomainPatterns(data.domainPatterns);
  }

  // 3. 未設定 → 空配列
  return Result.succeed([]);
}

/**
 * 現在のURLにマッチするパターンの行フィルタリング設定を取得
 * @param domainPatternConfigs - パターン設定配列
 * @param currentUrl - 現在のURL
 * @returns 成功時はenableRowFilterの値、失敗時はエラーメッセージ
 */
export function getCurrentPatternRowFilterSetting(
  domainPatternConfigs: DomainPatternConfig[],
  currentUrl: string
): Result.Result<boolean, string> {
  const urlWithoutProtocol = currentUrl.replace(HTTP_PROTOCOL_REGEX, "");

  for (const config of domainPatternConfigs) {
    const patternWithoutProtocol = config.pattern.replace(
      HTTP_PROTOCOL_REGEX,
      ""
    );
    const regex = patternToRegex(patternWithoutProtocol);
    if (regex.test(urlWithoutProtocol)) {
      return Result.succeed(config.enableRowFilter);
    }
  }

  // マッチするパターンがない場合はfalse
  return Result.succeed(false);
}

/**
 * ストレージから設定をリフレッシュ
 * @returns 正規化されたDomainPatternConfig配列
 */
export async function refreshTableConfig(): Promise<DomainPatternConfig[]> {
  const result = await storageSyncGet<StorageData>([
    "domainPatternConfigs",
    "domainPatterns",
  ]);

  if (Result.isSuccess(result)) {
    const configsResult = normalizeDomainPatternConfigs(result.value);
    return Result.isSuccess(configsResult) ? configsResult.value : [];
  }

  return [];
}
