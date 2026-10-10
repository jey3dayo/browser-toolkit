import { vi } from "vitest";
import type { ChatGptCredentials } from "@/schemas/chatgpt";

type Items = Record<string, unknown>;

function pick(store: Map<string, unknown>, keys: unknown): Items {
  const names =
    keys === null || keys === undefined
      ? [...store.keys()]
      : [keys].flat().map(String);
  const result: Items = {};
  for (const name of names) {
    if (store.has(name)) {
      result[name] = store.get(name);
    }
  }
  return result;
}

function removeKeys(store: Map<string, unknown>, keys: unknown): void {
  for (const name of [keys].flat().map(String)) {
    store.delete(name);
  }
}

export function installChatGptChrome(initialLocal: Items = {}) {
  const local = new Map<string, unknown>(Object.entries(initialLocal));
  const session = new Map<string, unknown>();
  const openTabs = new Set<number>();
  let nextTabId = 100;

  const tabs = {
    create: vi.fn(({ url }: { url: string }) => {
      const id = nextTabId;
      nextTabId += 1;
      openTabs.add(id);
      return Promise.resolve({ id, url });
    }),
    get: vi.fn((id: number) =>
      openTabs.has(id)
        ? Promise.resolve({ id })
        : Promise.reject(new Error("No tab"))
    ),
    remove: vi.fn((id: number) => {
      openTabs.delete(id);
      return Promise.resolve();
    }),
    update: vi.fn((_id: number, _props: { active?: boolean; url?: string }) =>
      Promise.resolve({})
    ),
  };
  const notifications = { create: vi.fn(() => Promise.resolve("id")) };

  vi.stubGlobal("chrome", {
    notifications,
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
      lastError: null,
    },
    storage: {
      local: {
        get: vi.fn((keys: unknown, callback: (items: Items) => void) =>
          callback(pick(local, keys))
        ),
        remove: vi.fn((keys: unknown, callback: () => void) => {
          removeKeys(local, keys);
          callback();
        }),
        set: vi.fn((items: Items, callback: () => void) => {
          for (const [key, value] of Object.entries(items)) {
            local.set(key, value);
          }
          callback();
        }),
      },
      session: {
        get: vi.fn((keys: unknown) => Promise.resolve(pick(session, keys))),
        remove: vi.fn((keys: unknown) => {
          removeKeys(session, keys);
          return Promise.resolve();
        }),
        set: vi.fn((items: Items) => {
          for (const [key, value] of Object.entries(items)) {
            session.set(key, value);
          }
          return Promise.resolve();
        }),
      },
    },
    tabs,
  });

  return { local, notifications, openTabs, session, tabs };
}

export function sampleCredentials(
  overrides: Partial<ChatGptCredentials> = {}
): ChatGptCredentials {
  return {
    accessToken: "access-1",
    clientId: "client-1",
    email: "me@example.com",
    expiresAt: Date.now() + 3_600_000,
    idToken: "id-token-1",
    refreshToken: "refresh-1",
    scope: "openid chatgpt.tokens.use.direct",
    subject: "user-1",
    ...overrides,
  };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
