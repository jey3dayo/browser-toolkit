import { applyAlwaysFocusedOverrides } from "@/focus-override/runtime";

(() => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  applyAlwaysFocusedOverrides(window, document);
})();
