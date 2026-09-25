import { afterEach, describe, expect, it, vi } from "vitest";
import { t } from "@/i18n";
import {
  closeImageViewer,
  isImageViewerOpen,
  openImageViewer,
  setImageViewerTheme,
} from "@/image-zoom/viewer";
import { computeZoomBounds } from "@/image-zoom/zoom-math";

const HOST_ID = "browser-toolkit-image-zoom";
const URL = "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=orig";
const SCALE_PATTERN = /scale\(([\d.]+)\)/;
const DEFAULT_VIEWPORT = { height: 768, width: 1024 };

function setViewportSize(width: number, height: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

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

function findButtonByLabel(label: string): HTMLButtonElement {
  const buttons = getHost()?.shadowRoot?.querySelectorAll("button");
  const button = buttons
    ? Array.from(buttons).find((candidate) => candidate.textContent === label)
    : undefined;
  if (!(button instanceof window.HTMLButtonElement)) {
    throw new Error(`button "${label}" not found`);
  }
  return button;
}

function getDownloadButton(): HTMLButtonElement {
  return findButtonByLabel(t("imageZoom.download"));
}

function getCloseButton(): HTMLButtonElement {
  return findButtonByLabel(t("imageZoom.close"));
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
    setViewportSize(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
  });

  it("opens as a labelled modal dialog and focuses the download button", () => {
    openImageViewer(URL, "light");

    const host = getHost();
    const shadow = host?.shadowRoot;
    const dialog = shadow?.querySelector('[role="dialog"]');

    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-label")).toBeTruthy();
    expect(getDownloadButton()).toBe(shadow?.activeElement);
  });

  it("has a real, accessibly named close button next to download", () => {
    openImageViewer(URL, "light");
    const closeButton = getCloseButton();
    expect(closeButton.tagName).toBe("BUTTON");
    expect(closeButton.textContent).toBe(t("imageZoom.close"));
  });

  it("initial scale is min(fitScale, 1) for a large image", () => {
    openImageViewer(URL, "light");
    fireImageLoad(4000, 3000);

    const img = getDialog().querySelector("img");
    if (!img) {
      throw new Error("viewer image not found");
    }
    const bounds = computeZoomBounds(
      4000,
      3000,
      window.innerWidth,
      window.innerHeight
    );
    const initialScale = Number(img.style.transform.match(SCALE_PATTERN)?.[1]);
    expect(initialScale).toBeCloseTo(bounds.min);
    expect(initialScale).toBeLessThan(1);
  });

  it("changes scale on wheel within [min(fitScale,1), 10] bounds", () => {
    openImageViewer(URL, "light");
    fireImageLoad(2000, 1000);

    const backdrop = getDialog();
    const img = backdrop.querySelector("img");
    if (!img) {
      throw new Error("viewer image not found");
    }

    const bounds = computeZoomBounds(
      2000,
      1000,
      window.innerWidth,
      window.innerHeight
    );
    const initialScale = Number(img.style.transform.match(SCALE_PATTERN)?.[1]);
    expect(initialScale).toBeCloseTo(bounds.min);

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
    expect(scaleAfterZoomIn).toBeGreaterThan(initialScale);

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

  it("closes via the close button without requiring a drag/click sequence", () => {
    openImageViewer(URL, "light");
    getCloseButton().click();
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

  it("stops a single-key shortcut (l) from reaching a page listener", () => {
    const pageListener = vi.fn();
    window.addEventListener("keydown", pageListener);

    openImageViewer(URL, "light");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { cancelable: true, key: "l" })
    );

    expect(pageListener).not.toHaveBeenCalled();
    expect(getHost()).not.toBeNull();

    window.removeEventListener("keydown", pageListener);
  });

  it("traps Tab between close and download, keeping focus in the shadow tree", () => {
    openImageViewer(URL, "light");
    const shadow = getHost()?.shadowRoot;
    expect(getDownloadButton()).toBe(shadow?.activeElement);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { cancelable: true, key: "Tab" })
    );
    expect(getCloseButton()).toBe(shadow?.activeElement);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        cancelable: true,
        key: "Tab",
        shiftKey: true,
      })
    );
    expect(getDownloadButton()).toBe(shadow?.activeElement);
  });

  it("shows a load-failure message on img error and stays closable", () => {
    openImageViewer(URL, "light");
    const img = getDialog().querySelector("img");
    if (!img) {
      throw new Error("viewer image not found");
    }
    img.dispatchEvent(new Event("error"));

    const errorText = getErrorText();
    expect(errorText.style.display).toBe("block");
    expect(errorText.textContent).toBe(t("imageZoom.errors.loadFailed"));

    getCloseButton().click();
    expect(getHost()).toBeNull();
  });

  it("recomputes bounds and raises scale to the new min on resize", () => {
    setViewportSize(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
    openImageViewer(URL, "light");
    fireImageLoad(4000, 3000);

    const img = getDialog().querySelector("img");
    if (!img) {
      throw new Error("viewer image not found");
    }
    const initialScale = Number(img.style.transform.match(SCALE_PATTERN)?.[1]);

    setViewportSize(2048, 1536);
    window.dispatchEvent(new Event("resize"));

    const newBounds = computeZoomBounds(4000, 3000, 2048, 1536);
    expect(newBounds.min).toBeGreaterThan(initialScale);

    const scaleAfterResize = Number(
      img.style.transform.match(SCALE_PATTERN)?.[1]
    );
    expect(scaleAfterResize).toBeCloseTo(newBounds.min);
  });

  it("applies a theme change to the open viewer via setImageViewerTheme", () => {
    openImageViewer(URL, "light");
    const shadow = getHost()?.shadowRoot;
    const shadowHost = shadow?.host;

    setImageViewerTheme("dark");

    expect(shadowHost?.getAttribute("data-theme")).toBe("dark");
  });

  it("does nothing when setImageViewerTheme is called while closed", () => {
    expect(isImageViewerOpen()).toBe(false);
    expect(() => setImageViewerTheme("dark")).not.toThrow();
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
