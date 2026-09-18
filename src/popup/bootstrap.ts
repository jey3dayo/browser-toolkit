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

// Base UI の ResizeObserver 再入で出る無害な警告だけを抑制する。
// 他も消すとコンソールが空に見え、実際の不具合の手がかりを失う。
const BENIGN_RESIZE_OBSERVER_MESSAGES = [
  "ResizeObserver loop completed with undelivered notifications",
  "ResizeObserver loop limit exceeded",
] as const;

function isBenignResizeObserverError(message: string): boolean {
  return BENIGN_RESIZE_OBSERVER_MESSAGES.some((benign) =>
    message.includes(benign)
  );
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

    window.addEventListener("error", (event) => {
      if (isBenignResizeObserverError(event.message)) {
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
