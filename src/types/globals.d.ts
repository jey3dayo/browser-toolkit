import type { BlocklistState } from "@/search-blocklist/types";

declare global {
  // `declare global` で global 変数を宣言するには `var` が必要（TypeScript の仕様）。
  var __MBU_BLOCKLIST_STATE__: BlocklistState | undefined;
  // content.js と image-zoom.js は同じ isolated world の別バンドルなので、
  // モーダルの「最上位」判定は globalThis 経由で共有する必要がある。
  var __MBU_MODAL_STACK__: symbol[] | undefined;
}
