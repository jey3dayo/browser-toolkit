import {
  isImageViewerOpen,
  openImageViewer,
  setImageViewerTheme,
} from "@/image-zoom/viewer";
import {
  isLightboxRoute,
  pickTargetImage,
  toOriginalUrl,
} from "@/image-zoom/x-adapter";
import type { Theme } from "@/ui/theme";
import { loadStoredTheme, normalizeTheme } from "@/ui/themeStorage";

let started = false;
let currentTheme: Theme = "auto";

function handleClick(e: MouseEvent): void {
  if (isImageViewerOpen()) {
    return;
  }
  if (
    e.button !== 0 ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    !isLightboxRoute(window.location.pathname)
  ) {
    return;
  }
  const target = pickTargetImage(
    document.elementsFromPoint(e.clientX, e.clientY)
  );
  if (!target) {
    return;
  }
  const originalUrl = toOriginalUrl(target.currentSrc || target.src);
  if (!originalUrl) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  openImageViewer(originalUrl, currentTheme);
}

function setupThemeSync(): void {
  if (!chrome.storage?.onChanged) {
    return;
  }
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !("theme" in changes)) {
      return;
    }
    currentTheme = normalizeTheme(changes.theme?.newValue);
    setImageViewerTheme(currentTheme);
  });
}

export async function startImageZoomRuntime(): Promise<void> {
  if (started) {
    return;
  }
  started = true;

  window.addEventListener("click", handleClick, true);
  setupThemeSync();
  currentTheme = await loadStoredTheme("auto");
}
