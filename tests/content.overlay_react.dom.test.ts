import { Result } from "@praha/byethrow";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flush } from "./helpers/async";
import { type ChromeStub, createChromeStub } from "./helpers/chromeStub";
import { inputValue } from "./helpers/forms";

type ContentRequest =
  | {
      action: "showActionOverlay";
      status: "loading" | "ready" | "error";
      mode: "text" | "event";
      source: "selection" | "page";
      title: string;
      primary?: string;
      secondary?: string;
      calendarUrl?: string;
      ics?: string;
      event?: {
        title: string;
        start: string;
        end?: string;
        allDay?: boolean;
        location?: string;
        description?: string;
      };
    }
  | {
      action: "showSummaryOverlay";
      status: "loading" | "ready" | "error";
      source: "selection" | "page";
      summary?: string;
      error?: string;
    }
  | { action: "enableTableSort" };

async function dispatchMessage(
  listener: (...args: unknown[]) => unknown,
  request: ContentRequest,
  window: Window
): Promise<void> {
  const sendResponse = vi.fn();
  listener(request, {}, sendResponse);
  await flush(window, 6);
}

describe("content overlay (React + Shadow DOM)", () => {
  let dom: JSDOM;
  let listeners: Array<(...args: unknown[]) => unknown>;
  let chromeStub: ChromeStub;

  beforeEach(async () => {
    vi.resetModules();
    (
      globalThis as unknown as { __MBU_CONTENT_STATE__?: unknown }
    ).__MBU_CONTENT_STATE__ = undefined;

    dom = new JSDOM("<!doctype html><html><body></body></html>", {
      url: "https://example.com/",
    });
    listeners = [];
    chromeStub = createChromeStub({ listeners });

    Object.defineProperty(dom.window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(() => Promise.resolve(undefined)),
      },
    });

    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("chrome", chromeStub);

    await import("@/content/overlay-helpers");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mounts overlay idempotently across multiple initializations", async () => {
    await import("@/content.ts");
    expect(listeners.length).toBeGreaterThan(0);

    const request: ContentRequest = {
      action: "showActionOverlay",
      status: "ready",
      mode: "text",
      source: "page",
      title: "Test",
      primary: "hello",
    };

    for (const listener of listeners) {
      await dispatchMessage(listener, request, dom.window);
    }

    expect(
      dom.window.document.querySelectorAll("#browser-toolkit-overlay").length
    ).toBe(1);

    vi.resetModules();
    await import("@/content.ts");

    for (const listener of listeners) {
      await dispatchMessage(listener, request, dom.window);
    }

    expect(
      dom.window.document.querySelectorAll("#browser-toolkit-overlay").length
    ).toBe(1);
  });

  it("shows an error toast in the shadow root when clipboard write fails", async () => {
    await import("@/content.ts");
    const [listener] = listeners;
    if (!listener) {
      throw new Error("missing message listener");
    }

    const clipboard = dom.window.navigator.clipboard as unknown as {
      writeText: ReturnType<typeof vi.fn>;
    };
    clipboard.writeText.mockRejectedValueOnce(new Error("denied"));

    await dispatchMessage(
      listener,
      {
        action: "showActionOverlay",
        status: "ready",
        mode: "text",
        source: "page",
        title: "Test",
        primary: "hello",
      },
      dom.window
    );

    const host = dom.window.document.querySelector<HTMLDivElement>(
      "#browser-toolkit-overlay"
    );
    const shadow = host?.shadowRoot ?? null;
    expect(shadow).not.toBeNull();

    const copyButton = shadow?.querySelector<HTMLButtonElement>(
      '[data-testid="overlay-copy"]'
    );
    expect(copyButton).not.toBeNull();

    copyButton?.click();
    await flush(dom.window, 6);

    expect(shadow?.textContent).toContain("コピーに失敗しました");
    expect(
      shadow?.querySelector('[data-testid="overlay-copy"]')
    ).not.toBeNull();
    expect(
      dom.window.document.querySelector("#browser-toolkit-overlay")
    ).not.toBeNull();
  });

  it("hides the copy button while overlay is loading", async () => {
    await import("@/content.ts");
    const [listener] = listeners;
    if (!listener) {
      throw new Error("missing message listener");
    }

    await dispatchMessage(
      listener,
      {
        action: "showActionOverlay",
        status: "loading",
        mode: "text",
        source: "page",
        title: "Test",
      },
      dom.window
    );

    const host = dom.window.document.querySelector<HTMLDivElement>(
      "#browser-toolkit-overlay"
    );
    const shadow = host?.shadowRoot ?? null;
    expect(shadow).not.toBeNull();

    expect(shadow?.textContent).toContain("処理中...");
    expect(shadow?.querySelector('[data-testid="overlay-copy"]')).toBeNull();
  });

  it("cycles overlay theme and persists it to storage", async () => {
    await import("@/content.ts");
    const [listener] = listeners;
    if (!listener) {
      throw new Error("missing message listener");
    }

    await dispatchMessage(
      listener,
      {
        action: "showActionOverlay",
        status: "ready",
        mode: "text",
        source: "page",
        title: "Test",
        primary: "hello",
      },
      dom.window
    );

    const host = dom.window.document.querySelector<HTMLDivElement>(
      "#browser-toolkit-overlay"
    );
    const shadow = host?.shadowRoot ?? null;
    expect(shadow).not.toBeNull();

    const themeButton = shadow?.querySelector<HTMLButtonElement>(
      '[data-testid="overlay-theme"]'
    );
    if (!themeButton) {
      throw new Error("overlay theme button not found");
    }

    expect(themeButton.getAttribute("aria-label")).toContain("自動");

    themeButton.click();
    await flush(dom.window, 6);

    const lastCall = chromeStub.storage.local.set.mock.calls.at(-1);
    expect(lastCall?.[0]).toEqual({ theme: "light" });
    expect(themeButton.getAttribute("aria-label")).toContain("ライト");
  });

  it("does not duplicate the source label in summary overlay titles", async () => {
    await import("@/content.ts");
    const [listener] = listeners;
    if (!listener) {
      throw new Error("missing message listener");
    }

    await dispatchMessage(
      listener,
      {
        action: "showSummaryOverlay",
        status: "ready",
        source: "page",
        summary: "hello",
      },
      dom.window
    );

    const host = dom.window.document.querySelector<HTMLDivElement>(
      "#browser-toolkit-overlay"
    );
    const shadow = host?.shadowRoot ?? null;
    expect(shadow).not.toBeNull();

    expect(shadow?.textContent).toContain("要約");
    expect(shadow?.textContent).toContain("ページ本文");
    expect(shadow?.textContent).not.toContain("要約（ページ本文）");
    expect(shadow?.textContent).not.toContain("要約（選択範囲）");
  });

  it("renders event overlay with table + quote, hides link-copy, and keeps pin next to close", async () => {
    await import("@/content.ts");
    const [listener] = listeners;
    if (!listener) {
      throw new Error("missing message listener");
    }

    await dispatchMessage(
      listener,
      {
        action: "showActionOverlay",
        status: "ready",
        mode: "event",
        source: "selection",
        title: "カレンダー登録する（選択範囲）",
        primary: "タイトル: test",
        secondary: "選択範囲:\n引用テキスト",
        calendarUrl: "https://calendar.google.com/",
        ics: "BEGIN:VCALENDAR\nEND:VCALENDAR",
        event: {
          title: "ゆず コンサート",
          start: "2026-05-04T16:00:00+09:00",
          end: "2026-05-04T19:00:00+09:00",
          location: "宮城・セキスイハイムスーパーアリーナ",
          description: "概要テキスト",
        },
      },
      dom.window
    );

    const host = dom.window.document.querySelector<HTMLDivElement>(
      "#browser-toolkit-overlay"
    );
    const shadow = host?.shadowRoot ?? null;
    expect(shadow).not.toBeNull();

    expect(shadow?.textContent).toContain("ゆず コンサート");
    expect(shadow?.textContent).toContain(
      "宮城・セキスイハイムスーパーアリーナ"
    );
    expect(shadow?.textContent).toContain("概要テキスト");

    const table = shadow?.querySelector("table");
    expect(table).not.toBeNull();

    const quote = shadow?.querySelector<HTMLElement>(".mbu-overlay-quote");
    expect(quote).not.toBeNull();
    expect(quote?.textContent).toContain("引用テキスト");

    const hasLinkCopyButton = Array.from(
      shadow?.querySelectorAll("button") ?? []
    ).some((btn) => btn.textContent?.includes("リンクコピー"));
    expect(hasLinkCopyButton).toBe(false);

    const actions = shadow?.querySelector<HTMLElement>(".mbu-overlay-actions");
    expect(actions).not.toBeNull();

    expect(actions?.querySelector('[data-testid="overlay-copy"]')).toBeNull();

    const bodyActions = shadow?.querySelector<HTMLElement>(
      ".mbu-overlay-body-actions"
    );
    expect(bodyActions).not.toBeNull();
    expect(
      bodyActions?.querySelector('[data-testid="overlay-copy"]')
    ).not.toBeNull();
    expect(bodyActions?.textContent).toContain(".ics");

    const pin = shadow?.querySelector<HTMLElement>(
      '[data-testid="overlay-pin"]'
    );
    const theme = shadow?.querySelector<HTMLElement>(
      '[data-testid="overlay-theme"]'
    );
    const close = shadow?.querySelector<HTMLElement>(
      '[data-testid="overlay-close"]'
    );
    expect(pin).not.toBeNull();
    expect(theme).not.toBeNull();
    expect(close).not.toBeNull();
    const buttons = Array.from(actions?.querySelectorAll("button") ?? []);
    const pinIndex = buttons.indexOf(pin as HTMLButtonElement);
    const themeIndex = buttons.indexOf(theme as HTMLButtonElement);
    const closeIndex = buttons.indexOf(close as HTMLButtonElement);
    expect(pinIndex).toBeGreaterThan(-1);
    expect(themeIndex).toBeGreaterThan(-1);
    expect(closeIndex).toBeGreaterThan(-1);
    expect(pinIndex).toBe(themeIndex - 1);
    expect(themeIndex).toBe(closeIndex - 1);

    expect(shadow?.textContent).not.toContain("（選択範囲）");
    expect(shadow?.textContent).toContain("選択範囲");
  });

  it("renders selection text as an auxiliary collapsed section in text mode", async () => {
    await import("@/content.ts");
    const [listener] = listeners;
    if (!listener) {
      throw new Error("missing message listener");
    }

    await dispatchMessage(
      listener,
      {
        action: "showActionOverlay",
        status: "ready",
        mode: "text",
        source: "selection",
        title: "要約（選択範囲）",
        primary: "結果テキスト",
        secondary: "選択範囲:\n引用テキスト",
      },
      dom.window
    );

    const host = dom.window.document.querySelector<HTMLDivElement>(
      "#browser-toolkit-overlay"
    );
    const shadow = host?.shadowRoot ?? null;
    expect(shadow).not.toBeNull();

    const aux = shadow?.querySelector<HTMLElement>(".mbu-overlay-aux");
    expect(aux).not.toBeNull();
    expect(
      shadow?.querySelector(".mbu-overlay-aux-summary")?.textContent
    ).toContain("選択したテキスト");

    const quote = shadow?.querySelector<HTMLElement>(".mbu-overlay-quote");
    expect(quote).not.toBeNull();
    expect(quote?.textContent).toContain("引用テキスト");

    const secondary = shadow?.querySelector<HTMLElement>(
      ".mbu-overlay-secondary-text"
    );
    expect(secondary?.textContent ?? "").not.toContain("引用テキスト");
  });

  it("renders follow-up chat messages through the message scroller contract", async () => {
    await import("@/content.ts");
    const [listener] = listeners;
    if (!listener) {
      throw new Error("missing message listener");
    }

    let resolveChat: ((value: unknown) => void) | null = null;
    chromeStub.runtime.sendMessage.mockImplementation((message: unknown) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "action" in message &&
        message.action === "chatFollowUp"
      ) {
        return new Promise((resolve) => {
          resolveChat = resolve;
        });
      }
      return Promise.resolve({ ok: true });
    });

    await dispatchMessage(
      listener,
      {
        action: "showActionOverlay",
        status: "ready",
        mode: "text",
        source: "page",
        title: "Test",
        primary: "最初の回答",
      },
      dom.window
    );

    const host = dom.window.document.querySelector<HTMLDivElement>(
      "#browser-toolkit-overlay"
    );
    const shadow = host?.shadowRoot ?? null;
    expect(shadow).not.toBeNull();

    const textarea = shadow?.querySelector<HTMLTextAreaElement>(
      ".mbu-overlay-chat-input"
    );
    if (!textarea) {
      throw new Error("chat textarea not found");
    }
    inputValue(dom.window, textarea, "追加質問");
    await flush(dom.window, 2);

    const sendButton = shadow?.querySelector<HTMLButtonElement>(
      ".mbu-overlay-chat-input-row button"
    );
    expect(sendButton).not.toBeNull();
    expect(sendButton?.disabled).toBe(false);

    sendButton?.click();
    await flush(dom.window, 6);

    const viewport = shadow?.querySelector<HTMLElement>(
      ".mbu-overlay-chat-scroller-viewport"
    );
    expect(viewport?.getAttribute("role")).toBe("region");
    expect(viewport?.getAttribute("aria-label")).toBe(
      "フォローアップの会話履歴"
    );

    const transcript = shadow?.querySelector<HTMLElement>(
      ".mbu-overlay-chat-messages"
    );
    expect(transcript?.getAttribute("role")).toBe("log");
    expect(transcript?.getAttribute("aria-busy")).toBe("true");

    const userItem = shadow?.querySelector<HTMLElement>(
      '[data-message-id="overlay-chat-message-0"]'
    );
    expect(userItem?.getAttribute("data-scroll-anchor")).toBe("true");
    expect(userItem?.textContent).toContain("追加質問");

    const thinkingItem = shadow?.querySelector<HTMLElement>(
      '[data-message-id="overlay-chat-thinking"]'
    );
    expect(thinkingItem?.getAttribute("data-scroll-anchor")).toBe("false");
    expect(thinkingItem?.textContent).toContain("考え中...");

    const jumpButton = shadow?.querySelector<HTMLButtonElement>(
      ".mbu-overlay-chat-scroller-button"
    );
    expect(jumpButton?.getAttribute("aria-label")).toBe("最新の応答へ移動");

    resolveChat?.(Result.succeed({ text: "追加回答" }));
    await flush(dom.window, 8);

    const assistantItem = shadow?.querySelector<HTMLElement>(
      '[data-message-id="overlay-chat-message-1"]'
    );
    expect(assistantItem?.getAttribute("data-scroll-anchor")).toBe("false");
    expect(assistantItem?.textContent).toContain("追加回答");
    expect(transcript?.getAttribute("aria-busy")).toBe("false");
    expect(
      shadow?.querySelector('[data-message-id="overlay-chat-thinking"]')
    ).toBeNull();
  });
});
