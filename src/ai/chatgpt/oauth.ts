import { Result } from "@praha/byethrow";
import { isRecord } from "@/utils/guards";

export const CHATGPT_AUTHORIZE_URL =
  "https://auth.openai.com/api/accounts/authorize";
export const CHATGPT_TOKEN_URL =
  "https://auth.openai.com/api/accounts/oauth/token";
export const CHATGPT_REVOKE_URL =
  "https://auth.openai.com/api/accounts/oauth/revoke";
export const CHATGPT_ISSUER = "https://auth.openai.com";
export const CHATGPT_RESOURCE = "https://api.openai.com/v1";
export const CHATGPT_REDIRECT_URI = "http://127.0.0.1:1455/auth/callback";
export const CHATGPT_USAGE_URL = "https://chatgpt.com/settings/usage";
export const CHATGPT_AGENT_NAME = "Browser Toolkit";

const DYNAMIC_CLIENT_ID = "dynamic_agent_client";
const PLAN_SCOPE = "chatgpt.tokens.use.direct";
const AUTHORIZE_SCOPE = `openid profile email offline_access resource.invoke ${PLAN_SCOPE}`;

const REAUTH_ERROR_CODES: ReadonlySet<string> = new Set([
  "invalid_grant",
  "invalid_refresh_token",
  "token_expired",
  "refresh_token_expired",
  "refresh_token_invalidated",
  "refresh_token_reused",
]);

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function readNonEmptyString(record: Record<string, unknown>, key: string) {
  const value = readString(record, key);
  return value === null || value === "" ? null : value;
}

export function buildChatGptAuthorizeUrl(params: {
  clientId: string | null;
  hostId: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  idTokenHint: string | null;
  loginHint: string | null;
}): string {
  const url = new URL(CHATGPT_AUTHORIZE_URL);
  const query = url.searchParams;
  query.set("response_type", "code");
  query.set("client_id", params.clientId ?? DYNAMIC_CLIENT_ID);
  if (params.clientId === null) {
    query.set("agent_name_hint", CHATGPT_AGENT_NAME);
  }
  query.set("redirect_uri", CHATGPT_REDIRECT_URI);
  query.set("scope", AUTHORIZE_SCOPE);
  query.set("resource", CHATGPT_RESOURCE);
  query.set("state", params.state);
  query.set("nonce", params.nonce);
  query.set("code_challenge", params.codeChallenge);
  query.set("code_challenge_method", "S256");
  query.set("ext_agent_host_id", params.hostId);
  if (params.idTokenHint !== null) {
    query.set("id_token_hint", params.idTokenHint);
  }
  if (params.loginHint !== null) {
    query.set("login_hint", params.loginHint);
  }
  return url.toString();
}

const WHITESPACE = /\s+/;
const REDIRECT = new URL(CHATGPT_REDIRECT_URI);

export function isChatGptRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === REDIRECT.origin && parsed.pathname === REDIRECT.pathname
    );
  } catch {
    return false;
  }
}

export function parseChatGptCallback(
  url: string,
  expected: { state: string; clientId: string | null }
): Result.Result<{ code: string; clientId: string }, string> {
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return Result.fail("サインインの応答URLを解釈できませんでした");
  }

  if (params.get("state") !== expected.state) {
    return Result.fail(
      "サインインの state が一致しません。もう一度サインインしてください"
    );
  }

  const error = params.get("error");
  if (error) {
    if (error === "access_denied") {
      return Result.fail(
        "ChatGPT プランの利用が許可されませんでした。サインインをやり直してください"
      );
    }
    return Result.fail(params.get("error_description") || error);
  }

  const code = params.get("code");
  if (!code) {
    return Result.fail("サインインの応答に認可コードが含まれていません");
  }

  const callbackClientId = params.get("client_id");
  if (expected.clientId !== null) {
    if (callbackClientId && callbackClientId !== expected.clientId) {
      return Result.fail(
        "サインインの応答が別のクライアント登録のものでした。もう一度サインインしてください"
      );
    }
    return Result.succeed({ clientId: expected.clientId, code });
  }

  if (!callbackClientId || callbackClientId === DYNAMIC_CLIENT_ID) {
    return Result.fail("サインインの応答にクライアント登録が含まれていません");
  }
  return Result.succeed({ clientId: callbackClientId, code });
}

export type ChatGptTokenSet = {
  accessToken: string;
  refreshToken: string;
  idToken: string | null;
  expiresIn: number;
  scope: string | null;
};

export type ChatGptTokenError = {
  code: string;
  message: string;
  requiresReauth: boolean;
};

export function parseChatGptTokenResponse(
  status: number,
  json: unknown
): Result.Result<ChatGptTokenSet, ChatGptTokenError> {
  const record = isRecord(json) ? json : {};

  if (status < 200 || status >= 300) {
    const code = readNonEmptyString(record, "error") ?? `http_${status}`;
    const description = readNonEmptyString(record, "error_description");
    const base = `ChatGPT のトークン取得に失敗しました (${code})`;
    return Result.fail({
      code,
      message: description ? `${base}: ${description}` : base,
      requiresReauth: REAUTH_ERROR_CODES.has(code),
    });
  }

  const accessToken = readNonEmptyString(record, "access_token");
  const refreshToken = readNonEmptyString(record, "refresh_token");
  const scope = readString(record, "scope");
  const expiresIn = record.expires_in;
  if (
    accessToken === null ||
    refreshToken === null ||
    typeof expiresIn !== "number" ||
    !Number.isFinite(expiresIn)
  ) {
    return Result.fail({
      code: "invalid_token_response",
      message: "ChatGPT のトークン応答の形式が不正です",
      requiresReauth: false,
    });
  }

  return Result.succeed({
    accessToken,
    expiresIn,
    idToken: readNonEmptyString(record, "id_token"),
    refreshToken,
    scope,
  });
}

export function hasChatGptPlanScope(scope: string): boolean {
  return scope.split(WHITESPACE).includes(PLAN_SCOPE);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecodeToString(value: string): string | null {
  try {
    const padded = value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const segments = jwt.split(".");
  if (segments.length !== 3) {
    return null;
  }
  const text = base64UrlDecodeToString(segments[1] ?? "");
  if (text === null) {
    return null;
  }
  try {
    const payload: unknown = JSON.parse(text);
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function validateChatGptIdToken(
  jwt: string,
  expected: { clientId: string; nonce: string; nowMs: number }
): Result.Result<{ subject: string; email: string | null }, string> {
  // 署名検証は省略: OIDC Core 1.0 §3.1.3.7 により、token endpoint から TLS で直接受け取った ID トークンは TLS による検証で代替できる
  const payload = decodeJwtPayload(jwt);
  if (payload === null) {
    return Result.fail("ID トークンの形式が不正です");
  }

  if (payload.iss !== CHATGPT_ISSUER) {
    return Result.fail("ID トークンの発行元が一致しません");
  }

  const { aud } = payload;
  const audienceMatches = Array.isArray(aud)
    ? aud.includes(expected.clientId)
    : aud === expected.clientId;
  if (!audienceMatches) {
    return Result.fail("ID トークンの対象クライアントが一致しません");
  }

  const { exp } = payload;
  if (typeof exp !== "number" || exp * 1000 <= expected.nowMs) {
    return Result.fail("ID トークンの有効期限が切れています");
  }

  if (payload.nonce !== expected.nonce) {
    return Result.fail("ID トークンの nonce が一致しません");
  }

  const subject = readNonEmptyString(payload, "sub");
  if (subject === null) {
    return Result.fail("ID トークンにユーザー識別子が含まれていません");
  }

  return Result.succeed({ email: readString(payload, "email"), subject });
}

export async function computeChatGptPkceChallenge(
  verifier: string
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64UrlEncode(new Uint8Array(digest));
}

export function randomUrlSafeToken(bytes: number): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function createChatGptPkce(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = randomUrlSafeToken(32);
  return { challenge: await computeChatGptPkceChallenge(verifier), verifier };
}
