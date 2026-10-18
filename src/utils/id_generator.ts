function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    // biome-ignore lint/suspicious/noBitwiseOperators: Required for hash algorithm
    hash = (Math.imul(31, hash) + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * 名前の衝突を防ぐため、slugの末尾にハッシュsuffixを追加する。
 * 日本語などslug化できない名前は `prefix:hash` になる。
 * 例: generateId("お買い物", "group") → "group:9f3b2d1a"
 */
export function generateId(name: string, prefix: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const hash = simpleHash(name).slice(0, 8);

  if (slug.length === 0) {
    return `${prefix}:${hash}`;
  }

  return `${prefix}:${slug}-${hash}`;
}
