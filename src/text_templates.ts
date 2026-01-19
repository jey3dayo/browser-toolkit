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
 * テンプレートIDを生成
 * @param title テンプレートのタイトル
 * @returns "template:xxx" 形式のID
 */
export function generateTemplateId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `template:${slug}`;
}
