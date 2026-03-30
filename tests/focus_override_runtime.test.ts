import { beforeEach, describe, expect, it, vi } from "vitest";

describe("focus override runtime", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("keeps the document visible and blocks focus-related listeners", async () => {
    const existingVisibilityListener = vi.fn();
    const newVisibilityListener = vi.fn();
    const existingBlurListener = vi.fn();
    const newBlurListener = vi.fn();

    document.addEventListener("visibilitychange", existingVisibilityListener);
    window.addEventListener("blur", existingBlurListener);

    const { applyAlwaysFocusedOverrides } = await import(
      "@/focus-override/runtime"
    );
    applyAlwaysFocusedOverrides(window, document);

    document.addEventListener("visibilitychange", newVisibilityListener);
    window.addEventListener("blur", newBlurListener);

    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("blur"));

    expect(document.visibilityState).toBe("visible");
    expect(document.hidden).toBe(false);
    expect(document.hasFocus()).toBe(true);
    expect(existingVisibilityListener).not.toHaveBeenCalled();
    expect(newVisibilityListener).not.toHaveBeenCalled();
    expect(existingBlurListener).not.toHaveBeenCalled();
    expect(newBlurListener).not.toHaveBeenCalled();
  });
});
