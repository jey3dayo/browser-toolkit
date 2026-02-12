/**
 * 検索エンジングループ機能
 *
 * 複数の検索エンジンをまとめて実行するグループ機能です。
 * 例: 「お買い物」グループでAmazon、楽天、ビックカメラ、ヨドバシを一括検索
 */

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
export const DEFAULT_SEARCH_ENGINE_GROUPS: SearchEngineGroup[] = [
  {
    id: "group:shopping-e8c8a7d5",
    name: "お買い物",
    engineIds: [
      "builtin:amazon-jp",
      "builtin:rakuten",
      "builtin:biccamera",
      "builtin:yodobashi",
      "builtin:mercari",
    ],
    enabled: true,
  },
  {
    id: "group:trend-9f3b2d1a",
    name: "トレンド",
    engineIds: ["builtin:x-twitter", "builtin:youtube", "builtin:google"],
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
