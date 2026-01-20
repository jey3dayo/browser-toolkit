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
    id: "template:lgtm-0023a134",
    title: "LGTM",
    content: "LGTM :+1:",
    hidden: false,
  },
  {
    id: "template:greptileai-review-390917b4",
    title: "greptileai review",
    content: "@greptileai review",
    hidden: false,
  },
  {
    id: "template:coderabbit-review-0f6905e9",
    title: "coderabbitai review",
    content: "@coderabbitai review",
    hidden: false,
  },
  {
    id: "template:greptileai-improve-49248104",
    title: "greptileai improve",
    content: "@greptileai コードの改善は可能ですか？",
    hidden: false,
  },
  {
    id: "template:greptileai-accept-56305a04",
    title: "greptileai accept",
    content: "@greptileai 許容してください",
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
 * タイトルの衝突を防ぐため、slugの末尾にハッシュsuffixを追加します。
 * 例: "Hello World" → "template:hello-world-a1b2c3d4"
 */
export function generateTemplateId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // タイトルのハッシュを短縮（最初の8文字）
  const hash = simpleHash(title).substring(0, 8);

  // slugが空の場合（非ASCII文字のみ）、ハッシュのみを使用
  if (slug.length === 0) {
    return `template:${hash}`;
  }

  // slugとハッシュを組み合わせて一意性を保証
  return `template:${slug}-${hash}`;
}
