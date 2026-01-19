/**
 * テキストテンプレート機能
 *
 * 右クリックメニューから定型文を貼り付けるための機能です。
 */

/**
 * テキストテンプレート型
 */
export type TextTemplate = {
  /**
   * テンプレートID (例: "template:lgtm")
   */
  id: string;

  /**
   * コンテキストメニューに表示する名前
   */
  title: string;

  /**
   * 挿入するテキスト内容
   */
  content: string;

  /**
   * コンテキストメニューで非表示にするかどうか
   */
  hidden: boolean;
};

/**
 * デフォルトのテキストテンプレート
 */
export const DEFAULT_TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: "template:lgtm",
    title: "LGTM",
    content: "LGTM :+1:",
    hidden: false,
  },
  {
    id: "template:greptile",
    title: "greptile review",
    content: "@greptile review",
    hidden: false,
  },
  {
    id: "template:coderabbit",
    title: "coderabbitai review",
    content: "@coderabbitai review",
    hidden: false,
  },
];

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
 * テンプレートIDを生成
 * @param title テンプレートのタイトル
 * @returns "template:xxx" 形式のID
 *
 * ASCII文字のみの場合はスラッグを生成、非ASCII文字のみの場合はハッシュを使用
 */
export function generateTemplateId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // slugが空の場合（非ASCII文字のみ）、タイトルのハッシュを使用
  if (slug.length === 0) {
    return `template:${simpleHash(title)}`;
  }

  return `template:${slug}`;
}
