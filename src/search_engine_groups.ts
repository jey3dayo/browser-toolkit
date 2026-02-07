/**
 * 検索エンジングループ機能
 *
 * 複数の検索エンジンをまとめて実行するグループ機能です。
 * 例: 「お買い物」グループでAmazon、楽天、ビックカメラ、ヨドバシを一括検索
 */

import { isRecord } from "@/utils/guards";
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
 * 文字列の簡易ハッシュを生成（非ASCII文字対応）
 * @param str 入力文字列
 * @returns 8桁の16進数ハッシュ
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // biome-ignore lint/suspicious/noBitwiseOperators: Required for hash calculation
    hash = (hash << 5) - hash + char;
    // biome-ignore lint/suspicious/noBitwiseOperators: Required for 32-bit conversion
    hash &= hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * グループIDを生成
 * @param name グループ名
 * @returns "group:xxx" 形式のID
 *
 * 名前の衝突を防ぐため、slugの末尾にハッシュsuffixを追加します。
 * 例: "お買い物" → "group:9f3b2d1a"
 */
export function generateGroupId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // 名前のハッシュを短縮（最初の8文字）
  const hash = simpleHash(name).substring(0, 8);

  // slugが空の場合（非ASCII文字のみ）、ハッシュのみを使用
  if (slug.length === 0) {
    return `group:${hash}`;
  }

  // slugとハッシュを組み合わせて一意性を保証
  return `group:${slug}-${hash}`;
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
