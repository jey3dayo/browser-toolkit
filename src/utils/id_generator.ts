/**
 * ID生成ユーティリティ
 *
 * プロジェクト全体で一貫したID生成ロジックを提供します。
 */

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
 * 一意なIDを生成
 * @param name 名前（日本語やスペースを含む可能性がある）
 * @param prefix IDのプレフィックス（例: "group", "template"）
 * @returns "{prefix}:{slug}-{hash}" 形式のID
 *
 * 名前の衝突を防ぐため、slugの末尾にハッシュsuffixを追加します。
 * 例: generateId("お買い物", "group") → "group:9f3b2d1a"
 * 例: generateId("Hello World", "template") → "template:hello-world-a1b2c3d4"
 */
export function generateId(name: string, prefix: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // 名前のハッシュを短縮（最初の8文字）
  const hash = simpleHash(name).substring(0, 8);

  // slugが空の場合（非ASCII文字のみ）、ハッシュのみを使用
  if (slug.length === 0) {
    return `${prefix}:${hash}`;
  }

  // slugとハッシュを組み合わせて一意性を保証
  return `${prefix}:${slug}-${hash}`;
}
