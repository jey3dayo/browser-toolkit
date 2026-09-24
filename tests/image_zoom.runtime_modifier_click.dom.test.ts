import { afterEach, describe, expect, it, vi } from "vitest";
import { startImageZoomRuntime } from "@/image-zoom/runtime";
import { closeImageViewer } from "@/image-zoom/viewer";

const HOST_ID = "browser-toolkit-image-zoom";
const MEDIA_URL = "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=large";

function getHost(): HTMLDivElement | null {
  const el = document.getElementById(HOST_ID);
  return el instanceof window.HTMLDivElement ? el : null;
}

describe("image-zoom runtime: modifier-click guard", () => {
  afterEach(() => {
    closeImageViewer();
    document.body.innerHTML = "";
    document.documentElement.innerHTML = "<head></head><body></body>";
    vi.unstubAllGlobals();
  });

  it("does not open the viewer when the click carries a modifier key", async () => {
    vi.stubGlobal("chrome", {
      runtime: { lastError: null },
      storage: {
        local: {
          get: (_keys: unknown, callback: (items: unknown) => void) => {
            callback({});
          },
        },
        onChanged: { addListener: vi.fn() },
      },
    });
    window.history.pushState({}, "", "/someuser/status/12345/photo/1");

    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    const pageImg = document.createElement("img");
    pageImg.src = MEDIA_URL;
    pageImg.getBoundingClientRect = () => ({
      bottom: 200,
      height: 200,
      left: 0,
      right: 200,
      toJSON() {
        return this;
      },
      top: 0,
      width: 200,
      x: 0,
      y: 0,
    });
    modal.appendChild(pageImg);
    document.body.appendChild(modal);

    document.elementsFromPoint = vi.fn(() => [modal]);

    await startImageZoomRuntime();

    window.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        button: 0,
        cancelable: true,
        clientX: 100,
        clientY: 100,
        ctrlKey: true,
      })
    );

    expect(getHost()).toBeNull();

    window.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        button: 0,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      })
    );

    expect(getHost()).not.toBeNull();
  });
});
