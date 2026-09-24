import { afterEach, describe, expect, it, vi } from "vitest";
import { closeImageViewer, openImageViewer } from "@/image-zoom/viewer";
import { computeZoomBounds } from "@/image-zoom/zoom-math";

const HOST_ID = "browser-toolkit-image-zoom";
const URL = "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=orig";
const SCALE_PATTERN = /scale\(([\d.]+)\)/;

function getHost(): HTMLDivElement | null {
  const el = document.getElementById(HOST_ID);
  return el instanceof window.HTMLDivElement ? el : null;
}

function getDialog(): HTMLDivElement {
  const dialog = getHost()?.shadowRoot?.querySelector('[role="dialog"]');
  if (!(dialog instanceof window.HTMLDivElement)) {
    throw new Error("viewer dialog not found");
  }
  return dialog;
}

function getDownloadButton(): HTMLButtonElement {
  const button = getHost()?.shadowRoot?.querySelector("button");
  if (!(button instanceof window.HTMLButtonElement)) {
    throw new Error("download button not found");
  }
  return button;
}

function getErrorText(): HTMLElement {
  const errorText = getHost()?.shadowRoot?.querySelector('[role="alert"]');
  if (!(errorText instanceof window.HTMLElement)) {
    throw new Error("error text not found");
  }
  return errorText;
}

function fireImageLoad(naturalWidth: number, naturalHeight: number): void {
  const host = getHost();
  const img = host?.shadowRoot?.querySelector("img");
  if (!img) {
    throw new Error("viewer image not found");
  }
  Object.defineProperty(img, "naturalWidth", {
    configurable: true,
    value: naturalWidth,
  });
  Object.defineProperty(img, "naturalHeight", {
    configurable: true,
    value: naturalHeight,
  });
  img.dispatchEvent(new Event("load"));
}

describe("image-zoom viewer", () => {
  afterEach(() => {
    closeImageViewer();
    document.body.innerHTML = "";
    document.documentElement.innerHTML = "<head></head><body></body>";
    vi.unstubAllGlobals();
  });

  it("opens as a labelled modal dialog and focuses the download button", () => {
    openImageViewer(URL, "light");

    const host = getHost();
    const shadow = host?.shadowRoot;
    const dialog = shadow?.querySelector('[role="dialog"]');
    const downloadButton = shadow?.querySelector("button");

    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-label")).toBeTruthy();
    expect(downloadButton).toBe(shadow?.activeElement);
  });

  it("changes scale on wheel within [min(fitScale,1), 10] bounds", () => {
    openImageViewer(URL, "light");
    fireImageLoad(2000, 1000);

    const backdrop = getDialog();
    const img = backdrop.querySelector("img");
    if (!img) {
      throw new Error("viewer image not found");
    }

    expect(img.style.transform).toContain("scale(1)");

    backdrop.dispatchEvent(
      new WheelEvent("wheel", {
        cancelable: true,
        clientX: 500,
        clientY: 400,
        deltaY: -500,
      })
    );
    const scaleAfterZoomIn = Number(
      img.style.transform.match(SCALE_PATTERN)?.[1]
    );
    expect(scaleAfterZoomIn).toBeGreaterThan(1);

    backdrop.dispatchEvent(
      new WheelEvent("wheel", {
        cancelable: true,
        clientX: 500,
        clientY: 400,
        deltaY: 100_000,
      })
    );
    const scaleAfterZoomOut = Number(
      img.style.transform.match(SCALE_PATTERN)?.[1]
    );
    const bounds = computeZoomBounds(
      2000,
      1000,
      window.innerWidth,
      window.innerHeight
    );
    expect(scaleAfterZoomOut).toBeCloseTo(bounds.min);
    expect(scaleAfterZoomOut).toBeLessThanOrEqual(scaleAfterZoomIn);
  });

  it("does not close on a drag beyond the threshold", () => {
    openImageViewer(URL, "light");
    fireImageLoad(2000, 1000);
    const backdrop = getDialog();

    backdrop.dispatchEvent(
      new PointerEvent("pointerdown", {
        button: 0,
        clientX: 100,
        clientY: 100,
        pointerId: 1,
      })
    );
    backdrop.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: 140,
        clientY: 140,
        pointerId: 1,
      })
    );
    backdrop.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: 140,
        clientY: 140,
        pointerId: 1,
      })
    );
    backdrop.dispatchEvent(
      new MouseEvent("click", { button: 0, clientX: 140, clientY: 140 })
    );

    expect(getHost()).not.toBeNull();
  });

  it("closes on a click without drag movement", () => {
    openImageViewer(URL, "light");
    fireImageLoad(2000, 1000);
    const backdrop = getDialog();

    backdrop.dispatchEvent(
      new PointerEvent("pointerdown", {
        button: 0,
        clientX: 100,
        clientY: 100,
        pointerId: 1,
      })
    );
    backdrop.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: 100,
        clientY: 100,
        pointerId: 1,
      })
    );
    backdrop.dispatchEvent(
      new MouseEvent("click", { button: 0, clientX: 100, clientY: 100 })
    );

    expect(getHost()).toBeNull();
  });

  it("closes on Escape and does not let it reach page listeners", () => {
    const pageListener = vi.fn();
    window.addEventListener("keydown", pageListener);

    openImageViewer(URL, "light");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { cancelable: true, key: "Escape" })
    );

    expect(getHost()).toBeNull();
    expect(pageListener).not.toHaveBeenCalled();

    window.removeEventListener("keydown", pageListener);
  });

  it("sends a download request on button click without closing, and shows a failure message", async () => {
    const sendMessage = vi.fn(async () => ({ error: "boom", type: "Failure" }));
    vi.stubGlobal("chrome", { runtime: { sendMessage } });

    openImageViewer(URL, "light");
    getDownloadButton().click();
    await vi.waitFor(() => {
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      const errorText = getErrorText();
      expect(errorText.style.display).toBe("block");
      expect(errorText.textContent).toBe("boom");
    });

    expect(getHost()).not.toBeNull();
  });
});
