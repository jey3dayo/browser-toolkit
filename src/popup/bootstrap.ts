import { Result } from "@praha/byethrow";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "@/popup/App";
import type { PaneSurface } from "@/popup/panes";
import { createPopupRuntime } from "@/popup/runtime";
import { ensurePopupUiBaseStyles } from "@/ui/styles";
import { applyTheme, isTheme } from "@/ui/theme";

type SurfaceTestHooks = {
  unmount?: () => void;
};

async function initTheme(): Promise<void> {
  const runtime = createPopupRuntime();
  const result = await runtime.storageLocalGet(["theme"]);
  if (Result.isFailure(result)) {
    applyTheme("auto", document);
    return;
  }
  const { theme } = result.value;
  applyTheme(isTheme(theme) ? theme : "auto", document);
}

function applySurfaceBodyClass(surface: PaneSurface): void {
  if (surface === "options") {
    document.body.classList.add("is-options");
    return;
  }
  if (window.location.protocol === "chrome-extension:") {
    document.body.classList.add("is-extension");
  }
}

export function bootstrapSurface(surface: PaneSurface): void {
  const testHooks = (
    globalThis as unknown as { __MBU_TEST_HOOKS__?: SurfaceTestHooks }
  ).__MBU_TEST_HOOKS__;

  let root: ReturnType<typeof createRoot> | null = null;
  let started = false;

  const start = (): void => {
    if (started) {
      return;
    }
    started = true;

    // Base UI の ResizeObserver 警告は機能に影響しないため抑制する
    window.addEventListener("error", (event) => {
      if (event.message.includes("ResizeObserver")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    ensurePopupUiBaseStyles(document);
    applyTheme("auto", document);
    initTheme().catch((error: unknown) => {
      console.error("Failed to initialize theme", error);
    });

    applySurfaceBodyClass(surface);

    const rootEl = document.getElementById("root");
    if (!rootEl) {
      throw new Error("Missing #root element in the surface document");
    }

    root = createRoot(rootEl);
    root.render(createElement(PopupApp, { surface }));
  };

  const unmount = (): void => {
    if (!started) {
      document.removeEventListener("DOMContentLoaded", start);
      return;
    }
    root?.unmount();
    root = null;
  };

  if (testHooks) {
    testHooks.unmount = unmount;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}
