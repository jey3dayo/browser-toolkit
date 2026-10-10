import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import {
  buildChatGptAuthorizeUrl,
  CHATGPT_ISSUER,
  CHATGPT_REDIRECT_URI,
  computeChatGptPkceChallenge,
  createChatGptPkce,
  hasChatGptPlanScope,
  isChatGptRedirectUrl,
  parseChatGptCallback,
  parseChatGptTokenResponse,
  randomUrlSafeToken,
  validateChatGptIdToken,
} from "@/ai/chatgpt/oauth";

const VERIFIER_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

const baseParams = {
  codeChallenge: "challenge",
  hostId: "host-1",
  idTokenHint: null,
  loginHint: null,
  nonce: "nonce-1",
  state: "state-1",
};

describe("buildChatGptAuthorizeUrl", () => {
  it("初回は dynamic_agent_client と agent_name_hint を付ける", () => {
    const url = new URL(
      buildChatGptAuthorizeUrl({ ...baseParams, clientId: null })
    );
    const q = url.searchParams;
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://auth.openai.com/api/accounts/authorize"
    );
    expect(q.get("client_id")).toBe("dynamic_agent_client");
    expect(q.get("agent_name_hint")).toBe("Browser Toolkit");
    expect(q.get("response_type")).toBe("code");
    expect(q.get("redirect_uri")).toBe(CHATGPT_REDIRECT_URI);
    expect(q.get("scope")).toBe(
      "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct"
    );
    expect(q.get("resource")).toBe("https://api.openai.com/v1");
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.get("ext_agent_host_id")).toBe("host-1");
    expect(q.has("id_token_hint")).toBe(false);
    expect(q.has("login_hint")).toBe(false);
  });

  it("再認可は登録済み client_id と hint を使い agent_name_hint を付けない", () => {
    const q = new URL(
      buildChatGptAuthorizeUrl({
        ...baseParams,
        clientId: "client-9",
        idTokenHint: "id.token.hint",
        loginHint: "user@example.com",
      })
    ).searchParams;
    expect(q.get("client_id")).toBe("client-9");
    expect(q.has("agent_name_hint")).toBe(false);
    expect(q.get("id_token_hint")).toBe("id.token.hint");
    expect(q.get("login_hint")).toBe("user@example.com");
  });
});

describe("isChatGptRedirectUrl", () => {
  it("クエリ付きを許容し、パスの前方一致は通さない", () => {
    expect(isChatGptRedirectUrl(`${CHATGPT_REDIRECT_URI}?code=a&state=b`)).toBe(
      true
    );
    expect(isChatGptRedirectUrl("http://127.0.0.1:1455/auth/callbackX")).toBe(
      false
    );
    expect(isChatGptRedirectUrl("http://127.0.0.1:1456/auth/callback")).toBe(
      false
    );
    expect(isChatGptRedirectUrl("http://127.0.0.1:1455/auth/callback/x")).toBe(
      false
    );
    expect(isChatGptRedirectUrl("not a url")).toBe(false);
  });
});

describe("parseChatGptCallback", () => {
  const cb = (query: string) => `${CHATGPT_REDIRECT_URI}?${query}`;

  it("再認可で client_id が無くても成功する", () => {
    const result = parseChatGptCallback(cb("code=abc&state=s"), {
      clientId: "c1",
      state: "s",
    });
    expect(result).toEqual(Result.succeed({ clientId: "c1", code: "abc" }));
  });

  it("初回は callback の client_id を採用する", () => {
    const result = parseChatGptCallback(cb("code=abc&state=s&client_id=new"), {
      clientId: null,
      state: "s",
    });
    expect(result).toEqual(Result.succeed({ clientId: "new", code: "abc" }));
  });

  it("state 不一致は error パラメータより先に拒否する", () => {
    const result = parseChatGptCallback(cb("error=access_denied&state=other"), {
      clientId: null,
      state: "s",
    });
    expect(Result.isFailure(result) && result.error).toContain("state");
  });

  it("access_denied はプラン利用の拒否として案内する", () => {
    const result = parseChatGptCallback(cb("error=access_denied&state=s"), {
      clientId: null,
      state: "s",
    });
    expect(Result.isFailure(result) && result.error).toContain(
      "許可されません"
    );
  });

  it("その他の error は error_description を優先する", () => {
    const withDesc = parseChatGptCallback(
      cb("error=server_error&error_description=boom&state=s"),
      { clientId: null, state: "s" }
    );
    const withoutDesc = parseChatGptCallback(cb("error=server_error&state=s"), {
      clientId: null,
      state: "s",
    });
    expect(Result.isFailure(withDesc) && withDesc.error).toBe("boom");
    expect(Result.isFailure(withoutDesc) && withoutDesc.error).toBe(
      "server_error"
    );
  });

  it("code が無ければ失敗する", () => {
    expect(
      Result.isFailure(
        parseChatGptCallback(cb("state=s"), { clientId: "c1", state: "s" })
      )
    ).toBe(true);
  });

  it("登録済み client_id と異なる callback の client_id を拒否する", () => {
    expect(
      Result.isFailure(
        parseChatGptCallback(cb("code=a&state=s&client_id=other"), {
          clientId: "c1",
          state: "s",
        })
      )
    ).toBe(true);
  });

  it("初回で client_id 欠落と dynamic_agent_client を拒否する", () => {
    expect(
      Result.isFailure(
        parseChatGptCallback(cb("code=a&state=s"), {
          clientId: null,
          state: "s",
        })
      )
    ).toBe(true);
    expect(
      Result.isFailure(
        parseChatGptCallback(
          cb("code=a&state=s&client_id=dynamic_agent_client"),
          {
            clientId: null,
            state: "s",
          }
        )
      )
    ).toBe(true);
  });
});

describe("parseChatGptTokenResponse", () => {
  it("成功応答を ChatGptTokenSet に変換する", () => {
    const result = parseChatGptTokenResponse(200, {
      access_token: "at",
      expires_in: 3600,
      id_token: "idt",
      refresh_token: "rt",
      scope: "openid chatgpt.tokens.use.direct",
    });
    expect(result).toEqual(
      Result.succeed({
        accessToken: "at",
        expiresIn: 3600,
        idToken: "idt",
        refreshToken: "rt",
        scope: "openid chatgpt.tokens.use.direct",
      })
    );
  });

  it("id_token が無ければ null にする", () => {
    const result = parseChatGptTokenResponse(200, {
      access_token: "at",
      expires_in: 1,
      refresh_token: "rt",
      scope: "openid",
    });
    expect(Result.isSuccess(result) && result.value.idToken).toBeNull();
  });

  it("scope が無い応答は scope を null にして成功させる", () => {
    const result = parseChatGptTokenResponse(200, {
      access_token: "at",
      expires_in: 1,
      refresh_token: "rt",
    });
    expect(Result.isSuccess(result) && result.value.scope).toBeNull();
  });

  it.each([
    "invalid_grant",
    "invalid_refresh_token",
    "token_expired",
    "refresh_token_expired",
    "refresh_token_invalidated",
    "refresh_token_reused",
  ])("%s は再認可が必要", (code) => {
    const result = parseChatGptTokenResponse(400, {
      error: code,
      error_description: "desc",
    });
    expect(Result.isFailure(result) && result.error).toMatchObject({
      code,
      requiresReauth: true,
    });
    expect(Result.isFailure(result) && result.error.message).toContain("desc");
  });

  it("再認可不要のエラーと error 欠落時の http_ コード", () => {
    const rate = parseChatGptTokenResponse(429, { error: "rate_limited" });
    expect(Result.isFailure(rate) && rate.error).toMatchObject({
      code: "rate_limited",
      requiresReauth: false,
    });
    const unknown = parseChatGptTokenResponse(502, "<html>");
    expect(Result.isFailure(unknown) && unknown.error).toMatchObject({
      code: "http_502",
      requiresReauth: false,
    });
  });

  it.each(["access_token", "refresh_token", "expires_in"])(
    "2xx でも %s が欠落していれば invalid_token_response",
    (missing) => {
      const full: Record<string, unknown> = {
        access_token: "at",
        expires_in: 10,
        refresh_token: "rt",
        scope: "openid",
      };
      delete full[missing];
      const result = parseChatGptTokenResponse(200, full);
      expect(Result.isFailure(result) && result.error).toMatchObject({
        code: "invalid_token_response",
        requiresReauth: false,
      });
    }
  );

  it("expires_in が数値でなければ invalid_token_response", () => {
    const result = parseChatGptTokenResponse(200, {
      access_token: "at",
      expires_in: "10",
      refresh_token: "rt",
      scope: "openid",
    });
    expect(Result.isFailure(result) && result.error.code).toBe(
      "invalid_token_response"
    );
  });
});

describe("hasChatGptPlanScope", () => {
  it("空白区切りの完全一致で判定する", () => {
    expect(hasChatGptPlanScope("openid chatgpt.tokens.use.direct")).toBe(true);
    expect(hasChatGptPlanScope("openid")).toBe(false);
    expect(hasChatGptPlanScope("chatgpt.tokens.use.direct.extra")).toBe(false);
    expect(hasChatGptPlanScope("")).toBe(false);
  });
});

describe("validateChatGptIdToken", () => {
  const nowMs = 1_700_000_000_000;
  const expected = { clientId: "c1", nonce: "n1", nowMs };

  function encode(value: unknown): string {
    return btoa(JSON.stringify(value))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  }

  function jwt(overrides: Record<string, unknown> = {}): string {
    const payload = {
      aud: "c1",
      email: "user@example.com",
      exp: nowMs / 1000 + 60,
      iss: CHATGPT_ISSUER,
      nonce: "n1",
      sub: "user-1",
      ...overrides,
    };
    return `${encode({ alg: "RS256" })}.${encode(payload)}.sig`;
  }

  it("有効なトークンから subject と email を返す", () => {
    expect(Result.unwrap(validateChatGptIdToken(jwt(), expected))).toEqual({
      email: "user@example.com",
      subject: "user-1",
    });
  });

  it("配列の aud に clientId が含まれていれば受理する", () => {
    expect(
      Result.isSuccess(
        validateChatGptIdToken(jwt({ aud: ["x", "c1"] }), expected)
      )
    ).toBe(true);
  });

  it("email が文字列でなければ null", () => {
    const result = validateChatGptIdToken(jwt({ email: 1 }), expected);
    expect(Result.isSuccess(result) && result.value.email).toBeNull();
  });

  it.each([
    ["iss", { iss: "https://evil.example" }],
    ["aud 文字列", { aud: "other" }],
    ["aud 配列", { aud: ["a", "b"] }],
    ["exp", { exp: nowMs / 1000 - 1 }],
    ["exp 境界", { exp: nowMs / 1000 }],
    ["nonce", { nonce: "other" }],
    ["sub 空", { sub: "" }],
  ])("%s の不一致を拒否する", (_label, override) => {
    expect(
      Result.isFailure(validateChatGptIdToken(jwt(override), expected))
    ).toBe(true);
  });

  it("JWT として解釈できない入力を拒否する", () => {
    expect(Result.isFailure(validateChatGptIdToken("abc", expected))).toBe(
      true
    );
    expect(Result.isFailure(validateChatGptIdToken("a.!!!.c", expected))).toBe(
      true
    );
  });
});

describe("PKCE", () => {
  it("RFC 7636 Appendix B のテストベクタと一致する", async () => {
    await expect(
      computeChatGptPkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
    ).resolves.toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("verifier は 32 byte 乱数の base64url で challenge と対応する", async () => {
    const { verifier, challenge } = await createChatGptPkce();
    expect(verifier).toMatch(VERIFIER_PATTERN);
    expect(challenge).toBe(await computeChatGptPkceChallenge(verifier));
  });

  it("randomUrlSafeToken は URL セーフで毎回異なる", () => {
    const a = randomUrlSafeToken(16);
    expect(a).toMatch(TOKEN_PATTERN);
    expect(randomUrlSafeToken(16)).not.toBe(a);
  });
});
