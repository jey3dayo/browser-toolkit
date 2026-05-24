import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PatternAddForm } from "@/components/shared/PatternAddForm";
import { flush } from "./helpers/async";
import { inputValue } from "./helpers/forms";
import { createPopupDom } from "./helpers/popupDom";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PatternAddForm", () => {
  it("reports submit failures to the caller", async () => {
    const dom = createPopupDom();
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);

    const container = dom.window.document.createElement("div");
    dom.window.document.body.append(container);
    const onSubmit = vi.fn(() => Promise.reject(new Error("save failed")));
    const onError = vi.fn();

    createRoot(container).render(
      <PatternAddForm
        inputTestId="pattern-input"
        onSubmit={onSubmit}
        onSubmitError={onError}
        onValueChange={() => {
          // no-op
        }}
        placeholder="example.com/*"
        value="example.com/*"
      />
    );
    await flush(dom.window);

    const input = dom.window.document.querySelector<HTMLInputElement>(
      '[data-testid="pattern-input"]'
    );
    expect(input).not.toBeNull();

    inputValue(dom.window, input as HTMLInputElement, "example.com/*");
    dom.window.document.querySelector("form")?.requestSubmit();
    await flush(dom.window);

    expect(onSubmit).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
