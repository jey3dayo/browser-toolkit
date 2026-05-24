/**
 * 検索エンジングループ機能
 *
 * 複数の検索エンジンをまとめて実行するグループ機能です。
 * 例: 「お買い物」グループでAmazon、楽天、ビックカメラ、ヨドバシを一括検索
 */

import { BUILTIN_SEARCH_ENGINE_IDS } from "@/search_engines";
import { isRecord } from "@/utils/guards";
import { generateId } from "@/utils/id_generator";
import { normalizeOptionalText } from "@/utils/text";

/**
 * 検索エンジングループ型
 */
export type SearchEngineGroup = {
  /**
   * グループID (例: "group:shopping")
   */
  id: string;

  /**
   * コンテキストメニューに表示する名前
   */
  name: string;

  /**
   * グループに含まれる検索エンジンのIDリスト
   */
  engineIds: string[];

  /**
   * コンテキストメニューで有効にするかどうか
   */
  enabled: boolean;
};

/**
 * デフォルトの検索エンジングループ
 */
export const SEARCH_ENGINE_GROUP_IDS = {
  SHOPPING: "group:shopping-e8c8a7d5",
  TREND: "group:trend-9f3b2d1a",
} as const;

export const DEFAULT_SEARCH_ENGINE_GROUPS: SearchEngineGroup[] = [
  {
    id: SEARCH_ENGINE_GROUP_IDS.SHOPPING,
    name: "お買い物",
    engineIds: [
      BUILTIN_SEARCH_ENGINE_IDS.AMAZON_JP,
      BUILTIN_SEARCH_ENGINE_IDS.RAKUTEN,
      BUILTIN_SEARCH_ENGINE_IDS.BICCAMERA,
      BUILTIN_SEARCH_ENGINE_IDS.YODOBASHI,
      BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE,
      BUILTIN_SEARCH_ENGINE_IDS.MERCARI,
    ],
    enabled: true,
  },
  {
    id: SEARCH_ENGINE_GROUP_IDS.TREND,
    name: "トレンド",
    engineIds: [
      BUILTIN_SEARCH_ENGINE_IDS.X_TWITTER,
      BUILTIN_SEARCH_ENGINE_IDS.YOUTUBE,
      BUILTIN_SEARCH_ENGINE_IDS.GOOGLE,
    ],
    enabled: true,
  },
];

/**
 * 最大グループ数
 */
export const MAX_SEARCH_ENGINE_GROUPS = 10;

/**
 * グループIDを生成
 * @param name グループ名
 * @returns "group:xxx" 形式のID
 *
 * 名前の衝突を防ぐため、slugの末尾にハッシュsuffixを追加します。
 * 例: "お買い物" → "group:9f3b2d1a"
 */
export function generateGroupId(name: string): string {
  return generateId(name, "group");
}

type SearchEngineGroupParts = {
  id: string | undefined;
  name: string | undefined;
  engineIds: string[] | undefined;
  enabled: boolean;
};

function buildSearchEngineGroup(
  parts: SearchEngineGroupParts
): SearchEngineGroup | null {
  if (!(parts.id && parts.name && parts.engineIds)) {
    return null;
  }
  return {
    id: parts.id,
    name: parts.name,
    engineIds: parts.engineIds,
    enabled: parts.enabled,
  };
}

/**
 * Type guard for SearchEngineGroup
 */
function coerceSearchEngineGroup(value: unknown): SearchEngineGroup | null {
  if (!isRecord(value)) {
    return null;
  }
  const raw = value as Partial<SearchEngineGroup>;

  // engineIds のバリデーション
  let engineIds: string[] | undefined;
  if (Array.isArray(raw.engineIds)) {
    engineIds = raw.engineIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0
    );
    if (engineIds.length === 0) {
      engineIds = undefined;
    }
  }

  return buildSearchEngineGroup({
    id: normalizeOptionalText(raw.id),
    name: normalizeOptionalText(raw.name),
    engineIds,
    enabled: raw.enabled !== false,
  });
}

/**
 * Normalizes search engine groups array from storage
 */
export function normalizeSearchEngineGroups(
  value: unknown
): SearchEngineGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const groups: SearchEngineGroup[] = [];
  for (const item of value) {
    const group = coerceSearchEngineGroup(item);
    if (group) {
      groups.push(group);
    }
  }
  return groups.slice(0, MAX_SEARCH_ENGINE_GROUPS);
}
