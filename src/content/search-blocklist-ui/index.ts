import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { ensureShadowMount } from "@/content/shadow_mount";
import type { BlocklistState } from "@/search-blocklist/types";
import { applyTheme } from "@/ui/theme";
import { loadStoredTheme, normalizeTheme } from "@/ui/themeStorage";
import { CountBar } from "./CountBar";
import {
  SEARCH_BLOCKLIST_COUNT_BAR_HOST_ID,
  SEARCH_BLOCKLIST_COUNT_BAR_ROOT_ID,
  SEARCH_BLOCKLIST_WIDGET_HOST_ID,
  SEARCH_BLOCKLIST_WIDGET_ROOT_ID,
} from "./constants";
import { FloatingWidget } from "./FloatingWidget";

let started = false;

function setupThemeSync(shadows: ShadowRoot[]): void {
  if (!chrome.storage?.onChanged) {
    return;
  }
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !("theme" in changes)) {
      return;
    }
    const nextTheme = normalizeTheme(changes.theme?.newValue);
    for (const shadow of shadows) {
      applyTheme(nextTheme, shadow);
    }
  });
}

export async function startSearchBlocklistUi(
  state: BlocklistState
): Promise<void> {
  if (started) {
    return;
  }
  started = true;

  await state.ready;

  const initialTheme = await loadStoredTheme("auto");

  const widgetMount = ensureShadowMount({
    hostId: SEARCH_BLOCKLIST_WIDGET_HOST_ID,
    rootId: SEARCH_BLOCKLIST_WIDGET_ROOT_ID,
    theme: initialTheme,
  });
  createRoot(widgetMount.rootEl).render(
    createElement(FloatingWidget, {
      host: widgetMount.host,
      state,
    })
  );

  const countBarMount = ensureShadowMount({
    hostId: SEARCH_BLOCKLIST_COUNT_BAR_HOST_ID,
    rootId: SEARCH_BLOCKLIST_COUNT_BAR_ROOT_ID,
    theme: initialTheme,
  });
  createRoot(countBarMount.rootEl).render(createElement(CountBar, { state }));

  function repositionCountBar(): void {
    const anchor =
      state.getSnapshot().entries.find((entry) => entry.container.isConnected)
        ?.container ?? null;
    if (!(anchor?.isConnected && anchor.parentElement)) {
      return;
    }
    if (countBarMount.host.nextSibling !== anchor) {
      anchor.parentElement.insertBefore(countBarMount.host, anchor);
    }
  }
  repositionCountBar();
  state.subscribe(repositionCountBar);

  setupThemeSync([widgetMount.shadow, countBarMount.shadow]);
}
