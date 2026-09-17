import type { BlocklistState } from "@/search-blocklist/types";

declare global {
  // `declare global` で global 変数を宣言するには `var` が必要（TypeScript の仕様）。
  var __MBU_BLOCKLIST_STATE__: BlocklistState | undefined;
}
