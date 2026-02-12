/**
 * テキストテンプレート機能
 *
 * 右クリックメニューから定型文を貼り付けるための機能です。
 */

import { generateId } from "@/utils/id_generator";

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
    id: "template:greptileai-review-390917b4",
    title: "greptileai review",
    content: "@greptileai review",
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
  {
    id: "template:coderabbit-review-0f6905e9",
    title: "coderabbitai review",
    content: "@coderabbitai review",
    hidden: false,
  },
  {
    id: "template:lgtm-0023a134",
    title: "LGTM",
    content: "LGTM :+1:",
    hidden: false,
  },
];

/**
 * テンプレートIDを生成
 * @param title テンプレートのタイトル
 * @returns "template:xxx" 形式のID
 *
 * タイトルの衝突を防ぐため、slugの末尾にハッシュsuffixを追加します。
 * 例: "Hello World" → "template:hello-world-a1b2c3d4"
 */
export function generateTemplateId(title: string): string {
  return generateId(title, "template");
}
