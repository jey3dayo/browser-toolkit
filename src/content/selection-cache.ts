import { storageLocalSet } from "@/storage/helpers";
import { ignoreRejection } from "@/utils/ignore_rejection";

/**
 * 現在の選択範囲をキャッシュに書き込む。
 * selectedTextOrigin を添えることで、消費側は同じ origin のページでのみ
 * キャッシュを fallback に使う。合成 mouseup では書き込まない。
 */
export function cacheCurrentSelection(): void {
  const selectedText = window.getSelection()?.toString().trim() ?? "";
  if (!selectedText) {
    return;
  }
  // file: などの opaque origin は "null" と直列化され、別ページの
  // キャッシュと区別が付かないため書き込まない
  if (window.location.origin === "null") {
    return;
  }
  ignoreRejection(
    storageLocalSet({
      selectedText,
      selectedTextOrigin: window.location.origin,
      selectedTextUpdatedAt: Date.now(),
    }),
    "content: store selected text"
  );
}

export function setupSelectionCache(): void {
  document.addEventListener("mouseup", (event) => {
    if (!event.isTrusted) {
      return;
    }
    cacheCurrentSelection();
  });
}
