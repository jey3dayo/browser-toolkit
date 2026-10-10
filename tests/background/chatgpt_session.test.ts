import { Result } from "@praha/byethrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeChatGptPkceChallenge } from "@/ai/chatgpt/oauth";
import { safeParseChatGptSignInState } from "@/schemas/chatgpt";
import { isRecord } from "@/utils/guards";
import {
  installChatGptChrome,
  jsonResponse,
  sampleCredentials,
} from "../helpers/chatgptChrome";

type Harness = ReturnType<typeof installChatGptChrome>;
type FetchCall = { url: string; params: URLSearchParams };

const HOST_ID_PATTERN = /^urn:uuid:/;
const REDIRECT = "http://127.0.0.1:1455/auth/callback";

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function idToken(claims: Record<string, unknown>): string {
  return `${base64Url({ alg: "none" })}.${base64Url({
    aud: "client-new",
    email: "me@example.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: "https://auth.openai.com",
    sub: "user-1",
    ...claims,
  })}.sig`;
}

function recordFetch(
  respond: (call: FetchCall) => Response | Promise<Response>
) {
  const calls: FetchCall[] = [];
  const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
    const call: FetchCall = {
      params: new URLSearchParams(String(init?.body ?? "")),
      url,
    };
    calls.push(call);
    return Promise.resolve(respond(call));
  });
  vi.stubGlobal("fetch", fetchSpy);
  return calls;
}

function authorizeUrlOf(harness: Harness): string {
  return harness.tabs.update.mock.calls[0]?.[1].url ?? "";
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const PLAN_SCOPE = "openid chatgpt.tokens.use.direct";

function pendingOf(harness: Harness) {
  return safeParseChatGptSignInState(harness.session.get("chatgptSignIn"));
}

describe("background: chatgpt_session", () => {
  let harness: Harness;

  beforeEach(() => {
    vi.resetModules();
    harness = installChatGptChrome();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("sign-in", () => {
    it("opens a dynamic-registration authorize URL and stores pending state", async () => {
      const { startChatGptSignIn, getChatGptAuthState } = await import(
        "@/background/chatgpt_session"
      );

      const result = await startChatGptSignIn();

      expect(Result.isSuccess(result)).toBe(true);
      const url = new URL(authorizeUrlOf(harness));
      expect(url.origin + url.pathname).toBe(
        "https://auth.openai.com/api/accounts/authorize"
      );
      expect(url.searchParams.get("client_id")).toBe("dynamic_agent_client");
      expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT);
      expect(url.searchParams.get("id_token_hint")).toBeNull();

      const pending = pendingOf(harness);
      expect(pending?.status).toBe("pending");
      if (pending?.status !== "pending") {
        throw new Error("expected pending");
      }
      expect(pending.clientId).toBeNull();
      expect(url.searchParams.get("state")).toBe(pending.state);
      expect(url.searchParams.get("nonce")).toBe(pending.nonce);
      expect(url.searchParams.get("code_challenge")).toBe(
        await computeChatGptPkceChallenge(pending.verifier)
      );
      expect(String(harness.local.get("chatgptHostId"))).toMatch(
        HOST_ID_PATTERN
      );
      expect((await getChatGptAuthState()).status).toBe("pending");
    });

    it("focuses the existing sign-in tab instead of opening another", async () => {
      const { startChatGptSignIn } = await import(
        "@/background/chatgpt_session"
      );
      await startChatGptSignIn();
      const pending = pendingOf(harness);
      const tabId = pending?.status === "pending" ? pending.tabId : -1;

      const second = await startChatGptSignIn();

      expect(Result.isSuccess(second)).toBe(true);
      expect(harness.tabs.create).toHaveBeenCalledTimes(1);
      expect(harness.tabs.update).toHaveBeenCalledWith(tabId, { active: true });
    });

    it("reuses the host id and passes hints from existing credentials", async () => {
      harness.local.set("chatgptHostId", "urn:uuid:fixed");
      harness.local.set("chatgptClientId", "client-1");
      harness.local.set("chatgptCredentials", sampleCredentials());
      const { startChatGptSignIn } = await import(
        "@/background/chatgpt_session"
      );

      await startChatGptSignIn();

      const url = new URL(authorizeUrlOf(harness));
      expect(url.searchParams.get("ext_agent_host_id")).toBe("urn:uuid:fixed");
      expect(url.searchParams.get("client_id")).toBe("client-1");
      expect(url.searchParams.get("id_token_hint")).toBe("id-token-1");
      expect(url.searchParams.get("login_hint")).toBe("me@example.com");
    });

    async function startAndGetPending() {
      const mod = await import("@/background/chatgpt_session");
      await mod.startChatGptSignIn();
      const pending = pendingOf(harness);
      if (pending?.status !== "pending") {
        throw new Error("expected pending");
      }
      return { mod, pending };
    }

    function callbackUrl(state: string, extra = "") {
      return `${REDIRECT}?code=auth-code&state=${state}&client_id=client-new${extra}`;
    }

    it("exchanges the code, stores credentials and client id, and clears pending", async () => {
      const { mod, pending } = await startAndGetPending();
      const calls = recordFetch(() =>
        jsonResponse(200, {
          access_token: "access-new",
          expires_in: 3600,
          id_token: idToken({ nonce: pending.nonce }),
          refresh_token: "refresh-new",
          scope: "openid chatgpt.tokens.use.direct",
        })
      );

      await mod.handleChatGptTabUpdated(
        pending.tabId,
        callbackUrl(pending.state)
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(
        "https://auth.openai.com/api/accounts/oauth/token"
      );
      expect(calls[0]?.params.get("grant_type")).toBe("authorization_code");
      expect(calls[0]?.params.get("code")).toBe("auth-code");
      expect(calls[0]?.params.get("code_verifier")).toBe(pending.verifier);
      expect(calls[0]?.params.get("client_id")).toBe("client-new");
      expect(harness.local.get("chatgptClientId")).toBe("client-new");
      const stored = harness.local.get("chatgptCredentials");
      expect(isRecord(stored) && stored.accessToken).toBe("access-new");
      expect(isRecord(stored) && stored.refreshToken).toBe("refresh-new");
      expect(harness.session.has("chatgptSignIn")).toBe(false);
      expect(harness.tabs.remove).toHaveBeenCalledWith(pending.tabId);
      expect((await mod.getChatGptAuthState()).status).toBe("signedIn");
    });

    it("ignores updates for other tabs and non-redirect URLs", async () => {
      const { mod, pending } = await startAndGetPending();
      const calls = recordFetch(() => jsonResponse(500, {}));

      await mod.handleChatGptTabUpdated(
        pending.tabId + 1,
        callbackUrl(pending.state)
      );
      await mod.handleChatGptTabUpdated(pending.tabId, "https://example.com/");
      await mod.handleChatGptTabUpdated(pending.tabId, undefined);

      expect(calls).toHaveLength(0);
      expect(pendingOf(harness)?.status).toBe("pending");
    });

    it("fails without storing credentials when state does not match", async () => {
      const { mod, pending } = await startAndGetPending();
      const calls = recordFetch(() => jsonResponse(200, {}));

      await mod.handleChatGptTabUpdated(pending.tabId, callbackUrl("wrong"));

      expect(calls).toHaveLength(0);
      expect(harness.local.has("chatgptCredentials")).toBe(false);
      expect((await mod.getChatGptAuthState()).status).toBe("failed");
    });

    it("fails without storing credentials when the plan scope is missing", async () => {
      const { mod, pending } = await startAndGetPending();
      recordFetch(() =>
        jsonResponse(200, {
          access_token: "a",
          expires_in: 3600,
          id_token: idToken({ nonce: pending.nonce }),
          refresh_token: "r",
          scope: "openid",
        })
      );

      await mod.handleChatGptTabUpdated(
        pending.tabId,
        callbackUrl(pending.state)
      );

      expect(harness.local.has("chatgptCredentials")).toBe(false);
      const state = await mod.getChatGptAuthState();
      expect(state.status).toBe("failed");
      expect(state.errorMessage).toContain("Plus / Pro");
    });

    it("fails without storing credentials when the id token nonce differs", async () => {
      const { mod, pending } = await startAndGetPending();
      recordFetch(() =>
        jsonResponse(200, {
          access_token: "a",
          expires_in: 3600,
          id_token: idToken({ nonce: "other" }),
          refresh_token: "r",
          scope: "openid chatgpt.tokens.use.direct",
        })
      );

      await mod.handleChatGptTabUpdated(
        pending.tabId,
        callbackUrl(pending.state)
      );

      expect(harness.local.has("chatgptCredentials")).toBe(false);
      expect((await mod.getChatGptAuthState()).status).toBe("failed");
    });

    it("creates a blank tab, saves pending, then navigates to the authorize URL", async () => {
      let pendingSavedBeforeNavigation = false;
      harness.tabs.update.mockImplementation(() => {
        pendingSavedBeforeNavigation = harness.session.has("chatgptSignIn");
        return Promise.resolve({});
      });
      const { startChatGptSignIn } = await import(
        "@/background/chatgpt_session"
      );

      await startChatGptSignIn();

      expect(harness.tabs.create).toHaveBeenCalledWith({ url: "about:blank" });
      expect(pendingSavedBeforeNavigation).toBe(true);
      expect(authorizeUrlOf(harness)).toContain(
        "https://auth.openai.com/api/accounts/authorize"
      );
    });

    function tokenSuccess(nonce: string, extra: Record<string, unknown> = {}) {
      return jsonResponse(200, {
        access_token: "access-new",
        expires_in: 3600,
        id_token: idToken({ nonce }),
        refresh_token: "refresh-new",
        scope: PLAN_SCOPE,
        ...extra,
      });
    }

    it("exchanges the code once when the redirect update fires repeatedly", async () => {
      const { mod, pending } = await startAndGetPending();
      const calls = recordFetch(() => tokenSuccess(pending.nonce));
      const url = callbackUrl(pending.state);

      await Promise.all([
        mod.handleChatGptTabUpdated(pending.tabId, url),
        mod.handleChatGptTabUpdated(pending.tabId, url),
      ]);

      expect(calls.filter((c) => c.url.endsWith("/oauth/token"))).toHaveLength(
        1
      );
      expect((await mod.getChatGptAuthState()).status).toBe("signedIn");
    });

    it("discards the result and revokes when signed out during the exchange", async () => {
      const { mod, pending } = await startAndGetPending();
      const gate = deferred<Response>();
      const calls = recordFetch((call) =>
        call.url.endsWith("/oauth/token") ? gate.promise : jsonResponse(200, {})
      );

      const handling = mod.handleChatGptTabUpdated(
        pending.tabId,
        callbackUrl(pending.state)
      );
      await vi.waitFor(() => expect(calls).toHaveLength(1));
      await mod.signOutChatGpt();
      gate.resolve(tokenSuccess(pending.nonce));
      await handling;

      expect(harness.local.has("chatgptCredentials")).toBe(false);
      expect(harness.session.has("chatgptSignIn")).toBe(false);
      const revoke = calls.find((c) => c.url.endsWith("/oauth/revoke"));
      expect(revoke?.params.get("token")).toBe("refresh-new");
    });

    it("records the client subject on first sign-in", async () => {
      const { mod, pending } = await startAndGetPending();
      recordFetch(() => tokenSuccess(pending.nonce));

      await mod.handleChatGptTabUpdated(
        pending.tabId,
        callbackUrl(pending.state)
      );

      expect(harness.local.get("chatgptClientSubject")).toBe("user-1");
    });

    it("rejects a different account for a registered client, revokes, and resets registration", async () => {
      harness.local.set("chatgptClientId", "client-new");
      harness.local.set("chatgptClientSubject", "someone-else");
      const existing = sampleCredentials({ clientId: "client-new" });
      harness.local.set("chatgptCredentials", existing);
      const { mod, pending } = await startAndGetPending();
      const calls = recordFetch((call) =>
        call.url.endsWith("/oauth/token")
          ? tokenSuccess(pending.nonce)
          : jsonResponse(200, {})
      );

      await mod.handleChatGptTabUpdated(
        pending.tabId,
        callbackUrl(pending.state)
      );

      expect(harness.local.get("chatgptCredentials")).toEqual(existing);
      expect(harness.local.has("chatgptClientId")).toBe(false);
      expect(harness.local.has("chatgptClientSubject")).toBe(false);
      const revoke = calls.find((c) => c.url.endsWith("/oauth/revoke"));
      expect(revoke?.params.get("token")).toBe("refresh-new");
      const state = await mod.getChatGptAuthState();
      expect(state.errorMessage).toContain("別の ChatGPT アカウント");
    });

    it.each([
      ["null", null],
      ["without the plan scope", "openid"],
    ])(
      "revokes the refresh token when the sign-in scope is %s",
      async (_name, scope) => {
        const { mod, pending } = await startAndGetPending();
        const calls = recordFetch((call) => {
          if (!call.url.endsWith("/oauth/token")) {
            return jsonResponse(200, {});
          }
          const body: Record<string, unknown> = {
            access_token: "a",
            expires_in: 3600,
            id_token: idToken({ nonce: pending.nonce }),
            refresh_token: "refresh-new",
          };
          if (scope !== null) {
            body.scope = scope;
          }
          return jsonResponse(200, body);
        });

        await mod.handleChatGptTabUpdated(
          pending.tabId,
          callbackUrl(pending.state)
        );

        expect(harness.local.has("chatgptCredentials")).toBe(false);
        const revoke = calls.find((c) => c.url.endsWith("/oauth/revoke"));
        expect(revoke?.params.get("token")).toBe("refresh-new");
      }
    );

    it("does not keep a client id after a failed first sign-in", async () => {
      const { mod, pending } = await startAndGetPending();
      recordFetch((call) =>
        call.url.endsWith("/oauth/token")
          ? jsonResponse(200, {
              access_token: "a",
              expires_in: 3600,
              id_token: idToken({ nonce: pending.nonce }),
              refresh_token: "refresh-new",
              scope: "openid",
            })
          : jsonResponse(200, {})
      );

      await mod.handleChatGptTabUpdated(
        pending.tabId,
        callbackUrl(pending.state)
      );
      expect(harness.local.has("chatgptClientId")).toBe(false);

      await mod.startChatGptSignIn();
      const url = new URL(harness.tabs.update.mock.calls.at(-1)?.[1].url ?? "");
      expect(url.searchParams.get("client_id")).toBe("dynamic_agent_client");
    });

    it("keeps the claim on the sign-in tab when another tab hits the redirect URL", async () => {
      const { mod, pending } = await startAndGetPending();
      const gate = deferred<Response>();
      const calls = recordFetch(() => gate.promise);
      const url = callbackUrl(pending.state);

      const first = mod.handleChatGptTabUpdated(pending.tabId, url);
      await vi.waitFor(() => expect(calls).toHaveLength(1));
      await mod.handleChatGptTabUpdated(pending.tabId + 1, url);
      const duplicate = mod.handleChatGptTabUpdated(pending.tabId, url);
      gate.resolve(tokenSuccess(pending.nonce));
      await Promise.all([first, duplicate]);

      expect(calls).toHaveLength(1);
    });

    it("clears pending when the sign-in tab is closed", async () => {
      const { mod, pending } = await startAndGetPending();

      await mod.handleChatGptTabRemoved(pending.tabId + 1);
      expect(pendingOf(harness)?.status).toBe("pending");

      await mod.handleChatGptTabRemoved(pending.tabId);
      expect(harness.session.has("chatgptSignIn")).toBe(false);
    });
  });

  describe("getChatGptAuthState", () => {
    it("prefers signedIn over a stale failed or pending session", async () => {
      harness.local.set("chatgptCredentials", sampleCredentials());
      const { getChatGptAuthState } = await import(
        "@/background/chatgpt_session"
      );

      harness.session.set("chatgptSignIn", {
        message: "boom",
        status: "failed",
      });
      expect(await getChatGptAuthState()).toEqual({
        email: "me@example.com",
        errorMessage: "boom",
        status: "signedIn",
      });

      harness.session.set("chatgptSignIn", {
        clientId: null,
        nonce: "n",
        state: "s",
        status: "pending",
        tabId: 1,
        verifier: "v",
      });
      expect((await getChatGptAuthState()).status).toBe("signedIn");
    });
  });

  describe("getChatGptAccessToken", () => {
    it("fails when signed out", async () => {
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );
      const result = await getChatGptAccessToken();
      expect(Result.isFailure(result)).toBe(true);
    });

    it("returns the stored token without refreshing while it is fresh", async () => {
      harness.local.set("chatgptCredentials", sampleCredentials());
      const calls = recordFetch(() => jsonResponse(500, {}));
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );

      const result = await getChatGptAccessToken();

      expect(Result.isSuccess(result) && result.value).toBe("access-1");
      expect(calls).toHaveLength(0);
    });

    function refreshSuccess() {
      return jsonResponse(200, {
        access_token: "access-2",
        expires_in: 3600,
        refresh_token: "refresh-2",
        scope: "openid chatgpt.tokens.use.direct",
      });
    }

    it("refreshes an expired token and stores the rotated refresh token", async () => {
      harness.local.set(
        "chatgptCredentials",
        sampleCredentials({ expiresAt: Date.now() + 30_000 })
      );
      const calls = recordFetch(refreshSuccess);
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );

      const result = await getChatGptAccessToken();

      expect(Result.isSuccess(result) && result.value).toBe("access-2");
      expect(calls[0]?.params.get("grant_type")).toBe("refresh_token");
      expect(calls[0]?.params.get("refresh_token")).toBe("refresh-1");
      expect(calls[0]?.params.get("client_id")).toBe("client-1");
      expect(calls[0]?.params.has("scope")).toBe(false);
      const stored = harness.local.get("chatgptCredentials");
      expect(isRecord(stored) && stored.refreshToken).toBe("refresh-2");
      expect(isRecord(stored) && stored.idToken).toBe("id-token-1");
    });

    it("keeps the stored scope when the refresh response omits it", async () => {
      harness.local.set(
        "chatgptCredentials",
        sampleCredentials({ expiresAt: Date.now() - 1000 })
      );
      recordFetch(() =>
        jsonResponse(200, {
          access_token: "access-2",
          expires_in: 3600,
          refresh_token: "refresh-2",
        })
      );
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );

      const result = await getChatGptAccessToken();

      expect(Result.isSuccess(result)).toBe(true);
      const stored = harness.local.get("chatgptCredentials");
      expect(isRecord(stored) && stored.scope).toBe(PLAN_SCOPE);
    });

    it("removes credentials when the refreshed scope lacks the plan scope", async () => {
      harness.local.set(
        "chatgptCredentials",
        sampleCredentials({ expiresAt: Date.now() - 1000 })
      );
      const calls = recordFetch((call) =>
        call.url.endsWith("/oauth/revoke")
          ? jsonResponse(200, {})
          : jsonResponse(200, {
              access_token: "access-2",
              expires_in: 3600,
              refresh_token: "refresh-2",
              scope: "openid",
            })
      );
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );

      const result = await getChatGptAccessToken();

      expect(Result.isFailure(result) && result.error).toContain("Plus / Pro");
      expect(harness.local.has("chatgptCredentials")).toBe(false);
      const revoke = calls.find((c) => c.url.endsWith("/oauth/revoke"));
      expect(revoke?.params.get("token")).toBe("refresh-2");
    });

    it("sends a single refresh request for concurrent callers", async () => {
      harness.local.set(
        "chatgptCredentials",
        sampleCredentials({ expiresAt: Date.now() - 1000 })
      );
      const calls = recordFetch(refreshSuccess);
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );

      const [first, second] = await Promise.all([
        getChatGptAccessToken(),
        getChatGptAccessToken(),
      ]);

      expect(calls).toHaveLength(1);
      expect(Result.isSuccess(first) && first.value).toBe("access-2");
      expect(Result.isSuccess(second) && second.value).toBe("access-2");
    });

    it("refreshes even a fresh token when forced", async () => {
      harness.local.set("chatgptCredentials", sampleCredentials());
      const calls = recordFetch(refreshSuccess);
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );

      await getChatGptAccessToken({ forceRefresh: true });

      expect(calls).toHaveLength(1);
    });

    it("removes credentials when the server requires re-authentication", async () => {
      harness.local.set(
        "chatgptCredentials",
        sampleCredentials({ expiresAt: Date.now() - 1000 })
      );
      recordFetch(() => jsonResponse(400, { error: "invalid_grant" }));
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );

      const result = await getChatGptAccessToken();

      expect(Result.isFailure(result)).toBe(true);
      expect(harness.local.has("chatgptCredentials")).toBe(false);
    });

    it("keeps credentials on network failure", async () => {
      harness.local.set(
        "chatgptCredentials",
        sampleCredentials({ expiresAt: Date.now() - 1000 })
      );
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new Error("offline")))
      );
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );

      const result = await getChatGptAccessToken();

      expect(Result.isFailure(result)).toBe(true);
      expect(harness.local.has("chatgptCredentials")).toBe(true);
    });

    it("keeps credentials on a 5xx response", async () => {
      harness.local.set(
        "chatgptCredentials",
        sampleCredentials({ expiresAt: Date.now() - 1000 })
      );
      recordFetch(() => jsonResponse(503, {}));
      const { getChatGptAccessToken } = await import(
        "@/background/chatgpt_session"
      );

      const result = await getChatGptAccessToken();

      expect(Result.isFailure(result)).toBe(true);
      expect(harness.local.has("chatgptCredentials")).toBe(true);
    });
  });

  describe("signOutChatGpt", () => {
    it("revokes the refresh token and keeps client and host ids", async () => {
      harness.local.set("chatgptCredentials", sampleCredentials());
      harness.local.set("chatgptClientId", "client-1");
      harness.local.set("chatgptHostId", "urn:uuid:fixed");
      harness.session.set("chatgptSignIn", { message: "x", status: "failed" });
      const calls = recordFetch(() => jsonResponse(200, {}));
      const { signOutChatGpt } = await import("@/background/chatgpt_session");

      const result = await signOutChatGpt();

      expect(Result.isSuccess(result) && result.value.revokeConfirmed).toBe(
        true
      );
      expect(calls[0]?.url).toBe(
        "https://auth.openai.com/api/accounts/oauth/revoke"
      );
      expect(calls[0]?.params.get("token")).toBe("refresh-1");
      expect(calls[0]?.params.get("token_type_hint")).toBe("refresh_token");
      expect(calls[0]?.params.get("client_id")).toBe("client-1");
      expect(harness.local.has("chatgptCredentials")).toBe(false);
      expect(harness.local.get("chatgptClientId")).toBe("client-1");
      expect(harness.local.get("chatgptHostId")).toBe("urn:uuid:fixed");
      expect(harness.session.has("chatgptSignIn")).toBe(false);
    });

    it("reports revokeConfirmed=false after repeated revoke failures", async () => {
      vi.useFakeTimers();
      harness.local.set("chatgptCredentials", sampleCredentials());
      const calls = recordFetch(() => jsonResponse(503, {}));
      const { signOutChatGpt } = await import("@/background/chatgpt_session");

      const pending = signOutChatGpt();
      await vi.runAllTimersAsync();
      const result = await pending;

      expect(calls).toHaveLength(3);
      expect(Result.isSuccess(result) && result.value.revokeConfirmed).toBe(
        false
      );
      expect(harness.local.has("chatgptCredentials")).toBe(false);
    });

    it("succeeds without a request when already signed out", async () => {
      const calls = recordFetch(() => jsonResponse(200, {}));
      const { signOutChatGpt } = await import("@/background/chatgpt_session");

      const result = await signOutChatGpt();

      expect(Result.isSuccess(result) && result.value.revokeConfirmed).toBe(
        true
      );
      expect(calls).toHaveLength(0);
    });
  });
});
