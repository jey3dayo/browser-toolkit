import { isImageViewerOpen, openImageViewer } from "@/image-zoom/viewer";
import {
  isLightboxRoute,
  isTargetImage,
  toOriginalUrl,
} from "@/image-zoom/x-adapter";
import type { Theme } from "@/ui/theme";
import { loadStoredTheme, normalizeTheme } from "@/ui/themeStorage";

let started = false;
let currentTheme: Theme = "auto";

function findTargetImage(
  clientX: number,
  clientY: number
): HTMLImageElement | null {
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const el of elements) {
    if (isTargetImage(el)) {
      return el;
    }
  }
  return null;
}

function handleClick(e: MouseEvent): void {
  if (isImageViewerOpen()) {
    return;
  }
  if (e.button !== 0 || !isLightboxRoute(window.location.pathname)) {
    return;
  }
  const target = findTargetImage(e.clientX, e.clientY);
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
