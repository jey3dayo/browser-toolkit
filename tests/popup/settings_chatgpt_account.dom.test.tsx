import { Result } from "@praha/byethrow";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsChatGptAccountSection } from "@/popup/panes/settings/SettingsChatGptAccountSection";
import { SettingsProviderSection } from "@/popup/panes/settings/SettingsProviderSection";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { ChatGptAuthState, PopupRuntime } from "@/popup/runtime";
import { flush } from "../helpers/async";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type StorageListener = (
  changes: Record<string, unknown>,
  areaName: string
) => void;

const SIGNED_OUT: ChatGptAuthState = {
  email: null,
  errorMessage: null,
  status: "signedOut",
};

function buildRuntime(overrides: Partial<PopupRuntime> = {}): PopupRuntime {
  return {
    diagnoseFocusOverride: async () =>
      Result.succeed({
        hasFocus: true,
        hidden: false,
        markerPresent: false,
        visibilityState: "visible",
      }),
    getActiveTab: async () => Result.succeed(null),
    getActiveTabId: async () => Result.succeed(1),
    getSearchResultTabId: async () => Result.succeed(1),
    isExtensionPage: true,
    matchesFocusOverridePatterns: () => false,
    openOptionsPane: async () => Result.succeed(),
    openUrl: () => {
      // no-op
    },
    reloadTab: async () => Result.succeed(),
    sendMessageToBackground: async () => Result.succeed({}),
    sendMessageToTab: async () => Result.succeed({}),
    storageLocalGet: async () => Result.succeed({}),
    storageLocalRemove: async () => Result.succeed(),
    storageLocalSet: async () => Result.succeed(),
    storageSyncGet: async () => Result.succeed({}),
    storageSyncSet: async () => Result.succeed(),
    ...overrides,
  };
}

function buildProps(runtime: PopupRuntime): PopupPaneBaseProps {
  return {
    notify: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
    runtime,
  };
}

type Handlers = {
  authState: () => unknown;
  signIn?: () => unknown | Promise<unknown>;
  signOut?: () => unknown;
  testAiToken?: () => unknown;
};

function backgroundFor(handlers: Handlers) {
  const sent: unknown[] = [];
  function send<TRequest, TResponse>(
    message: TRequest
  ): Promise<Result.Result<TResponse, string>>;
  async function send(
    message: unknown
  ): Promise<Result.Result<unknown, string>> {
    sent.push(message);
    const action =
      typeof message === "object" && message !== null && "action" in message
        ? message.action
        : null;
    if (action === "chatgptAuthState") {
      return Result.succeed(handlers.authState());
    }
    if (action === "chatgptSignIn") {
      return Result.succeed((await handlers.signIn?.()) ?? Result.succeed({}));
    }
    if (action === "chatgptSignOut") {
      return Result.succeed(
        handlers.signOut?.() ?? Result.succeed({ revokeConfirmed: true })
      );
    }
    if (action === "testAiToken") {
      return Result.succeed(handlers.testAiToken?.() ?? Result.succeed());
    }
    return Result.fail("unexpected");
  }
  return { send, sent };
}

const mountedRoots: Root[] = [];

async function render(element: React.ReactElement): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);
  await act(async () => {
    root.render(element);
    await flush(setTimeout);
  });
  return container;
}

function mountSection(runtime: PopupRuntime): Promise<HTMLDivElement> {
  return render(
    createElement(SettingsChatGptAccountSection, buildProps(runtime))
  );
}

function query(container: HTMLElement, testId: string): HTMLButtonElement {
  const el = container.querySelector<HTMLButtonElement>(
    `[data-testid="${testId}"]`
  );
  if (!el) {
    throw new Error(`missing ${testId}`);
  }
  return el;
}

describe("SettingsChatGptAccountSection", () => {
  afterEach(async () => {
    await act(async () => {
      for (const root of mountedRoots.splice(0)) {
        root.unmount();
      }
      await flush(setTimeout);
    });
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("signedOut: 見出し・説明・primary ボタンを描画する", async () => {
    const bg = backgroundFor({ authState: () => Result.succeed(SIGNED_OUT) });
    const container = await mountSection(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    const status = query(container, "chatgpt-status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain("ChatGPT プランを使う");
    expect(status.textContent).toContain("ChatGPT（Plus / Pro）の利用枠");
    expect(query(container, "chatgpt-sign-in").textContent).toBe(
      "ChatGPT で続行"
    );
  });

  it("pending: 案内と再送ボタンを描画する", async () => {
    const bg = backgroundFor({
      authState: () =>
        Result.succeed({ ...SIGNED_OUT, status: "pending" as const }),
    });
    const container = await mountSection(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    expect(query(container, "chatgpt-status").textContent).toContain(
      "ブラウザでサインインを続けてください"
    );
    await act(async () => {
      query(container, "chatgpt-sign-in").click();
      await flush(setTimeout);
    });
    expect(bg.sent).toContainEqual({ action: "chatgptSignIn" });
  });

  it("signedIn: email・補足・外部リンク・操作ボタンを描画し、email が null なら省略する", async () => {
    const bg = backgroundFor({
      authState: () =>
        Result.succeed({
          email: "user@example.com",
          errorMessage: null,
          status: "signedIn" as const,
        }),
    });
    const container = await mountSection(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    const status = query(container, "chatgpt-status");
    expect(status.textContent).toContain("ChatGPT プランを使用中");
    expect(status.textContent).toContain("user@example.com");
    const link = status.querySelector("a");
    expect(link?.getAttribute("href")).toBe(
      "https://chatgpt.com/settings/usage"
    );
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(query(container, "chatgpt-test")).not.toBeNull();
    expect(query(container, "chatgpt-sign-out")).not.toBeNull();
  });

  it("failed: errorMessage と再サインインを描画する", async () => {
    const bg = backgroundFor({
      authState: () =>
        Result.succeed({
          email: null,
          errorMessage: "認可に失敗しました",
          status: "failed" as const,
        }),
    });
    const container = await mountSection(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    expect(query(container, "chatgpt-status").textContent).toContain(
      "認可に失敗しました"
    );
    expect(query(container, "chatgpt-sign-in").textContent).toBe(
      "もう一度サインイン"
    );
  });

  it("不正な応答は握りつぶさず failed 表示にする", async () => {
    const bg = backgroundFor({
      authState: () => Result.succeed({ status: "bogus" }),
    });
    const container = await mountSection(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    expect(query(container, "chatgpt-status").textContent).toContain(
      "バックグラウンドの応答が不正です"
    );
  });

  it("続行押下で応答を待たず disabled になり chatgptSignIn を送る", async () => {
    let release: () => void = () => {
      // replaced below
    };
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bg = backgroundFor({
      authState: () => Result.succeed(SIGNED_OUT),
      signIn: async () => {
        await gate;
        return Result.succeed({});
      },
    });
    const container = await mountSection(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    await act(async () => {
      query(container, "chatgpt-sign-in").click();
      await flush(setTimeout, 1);
    });
    const button = query(container, "chatgpt-sign-in");
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("ブラウザを開いています…");
    expect(bg.sent).toContainEqual({ action: "chatgptSignIn" });
    await act(async () => {
      release();
      await flush(setTimeout);
    });
  });

  it("chatgptSignIn が失敗したら元に戻して error 通知する", async () => {
    const bg = backgroundFor({
      authState: () => Result.succeed(SIGNED_OUT),
      signIn: () => Result.fail("タブを開けません"),
    });
    const props = buildProps(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    const container = await render(
      createElement(SettingsChatGptAccountSection, props)
    );
    await act(async () => {
      query(container, "chatgpt-sign-in").click();
      await flush(setTimeout);
    });
    const button = query(container, "chatgpt-sign-in");
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("ChatGPT で続行");
    expect(props.notify.error).toHaveBeenCalledWith("タブを開けません");
  });

  it("サインアウトで chatgptSignOut を送り、失効未確認なら注意文言を通知する", async () => {
    const bg = backgroundFor({
      authState: () =>
        Result.succeed({
          email: null,
          errorMessage: null,
          status: "signedIn" as const,
        }),
      signOut: () => Result.succeed({ revokeConfirmed: false }),
    });
    const props = buildProps(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    const container = await render(
      createElement(SettingsChatGptAccountSection, props)
    );
    await act(async () => {
      query(container, "chatgpt-sign-out").click();
      await flush(setTimeout);
    });
    expect(bg.sent).toContainEqual({ action: "chatgptSignOut" });
    expect(props.notify.success).toHaveBeenCalledWith(
      "サインアウトしました。OpenAI 側での失効は確認できなかったため、必要なら ChatGPT の設定から接続を解除してください。"
    );
  });

  it("接続テストは token なしの testAiToken を送り、成功を通知する", async () => {
    const bg = backgroundFor({
      authState: () =>
        Result.succeed({
          email: null,
          errorMessage: null,
          status: "signedIn" as const,
        }),
    });
    const props = buildProps(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    const container = await render(
      createElement(SettingsChatGptAccountSection, props)
    );
    await act(async () => {
      query(container, "chatgpt-test").click();
      await flush(setTimeout);
    });
    expect(bg.sent).toContainEqual({ action: "testAiToken" });
    expect(props.notify.success).toHaveBeenCalledWith("トークンOK");
  });

  it("storage 変更通知で状態を取り直し、無関係な変更は無視する", async () => {
    let listener: StorageListener | null = null;
    vi.stubGlobal("chrome", {
      storage: {
        onChanged: {
          addListener: (fn: StorageListener) => {
            listener = fn;
          },
          removeListener: () => {
            listener = null;
          },
        },
      },
    });
    let current: ChatGptAuthState = SIGNED_OUT;
    const bg = backgroundFor({ authState: () => Result.succeed(current) });
    const container = await mountSection(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    const countStateRequests = (): number =>
      bg.sent.filter(
        (m) =>
          typeof m === "object" &&
          m !== null &&
          "action" in m &&
          m.action === "chatgptAuthState"
      ).length;
    expect(countStateRequests()).toBe(1);

    current = {
      email: "a@example.com",
      errorMessage: null,
      status: "signedIn",
    };
    await act(async () => {
      listener?.({ chatgptSignIn: {} }, "local");
      listener?.({ other: {} }, "session");
      await flush(setTimeout);
    });
    expect(countStateRequests()).toBe(1);

    await act(async () => {
      listener?.({ chatgptCredentials: {} }, "local");
      await flush(setTimeout);
    });
    expect(countStateRequests()).toBe(2);
    expect(query(container, "chatgpt-status").textContent).toContain(
      "a@example.com"
    );

    current = SIGNED_OUT;
    await act(async () => {
      listener?.({ chatgptSignIn: {} }, "session");
      await flush(setTimeout);
    });
    expect(countStateRequests()).toBe(3);
  });
});

describe("SettingsProviderSection with chatgpt", () => {
  afterEach(async () => {
    await act(async () => {
      for (const root of mountedRoots.splice(0)) {
        root.unmount();
      }
      await flush(setTimeout);
    });
    document.body.innerHTML = "";
  });

  it("chatgpt 選択時は token を空にし、トークン key を読まない", async () => {
    const storageLocalGet = vi.fn(async () =>
      Result.succeed({ openaiApiToken: "sk-existing" })
    );
    const setToken = vi.fn();
    const container = await render(
      createElement(SettingsProviderSection, {
        provider: "openai",
        runtime: buildRuntime({ storageLocalGet }),
        saveModel: async () => undefined,
        saveProvider: async () => undefined,
        setModel: vi.fn(),
        setProvider: vi.fn(),
        setToken,
      })
    );
    const radio = container.querySelector<HTMLElement>(
      'input[type="radio"][value="chatgpt"]'
    );
    expect(radio).not.toBeNull();
    await act(async () => {
      radio?.click();
      await flush(setTimeout);
    });
    expect(setToken).toHaveBeenCalledWith("");
    expect(setToken).not.toHaveBeenCalledWith("sk-existing");
    expect(storageLocalGet).not.toHaveBeenCalled();
  });
});

describe("SettingsChatGptAccountSection signedIn with errorMessage", () => {
  afterEach(async () => {
    await act(async () => {
      for (const root of mountedRoots.splice(0)) {
        root.unmount();
      }
      await flush(setTimeout);
    });
    document.body.innerHTML = "";
  });

  it("signedIn でも errorMessage を danger ヒントで併記し、操作ボタンを残す", async () => {
    const bg = backgroundFor({
      authState: () =>
        Result.succeed({
          email: "user@example.com",
          errorMessage: "再サインインに失敗しました",
          status: "signedIn" as const,
        }),
    });
    const container = await mountSection(
      buildRuntime({ sendMessageToBackground: bg.send })
    );
    const status = query(container, "chatgpt-status");
    expect(status.textContent).toContain("ChatGPT プランを使用中");
    const danger = status.querySelector(".hint--danger");
    expect(danger?.textContent).toBe("再サインインに失敗しました");
    expect(query(container, "chatgpt-test")).not.toBeNull();
    expect(query(container, "chatgpt-sign-out")).not.toBeNull();
  });
});
