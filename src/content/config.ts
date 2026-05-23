// 設定管理
import { Result } from "@praha/byethrow";
import {
  type DomainPatternConfig,
  type DomainPatternConfigStorageData,
  normalizeDomainPatternConfigs,
} from "@/domain-pattern-configs";
import { storageSyncGet } from "@/storage/helpers";

/**
 * ストレージから設定をリフレッシュ
 * @returns 正規化されたDomainPatternConfig配列
 */
export async function refreshTableConfig(): Promise<DomainPatternConfig[]> {
  const result = await storageSyncGet<DomainPatternConfigStorageData>([
    "domainPatternConfigs",
    "domainPatterns",
  ]);

  if (Result.isSuccess(result)) {
    const configsResult = normalizeDomainPatternConfigs(result.value);
    return Result.isSuccess(configsResult) ? configsResult.value : [];
  }

  return [];
}
