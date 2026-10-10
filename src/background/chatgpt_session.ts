import { Result } from "@praha/byethrow";
import {
  buildChatGptAuthorizeUrl,
  CHATGPT_REDIRECT_URI,
  CHATGPT_RESOURCE,
  CHATGPT_REVOKE_URL,
  CHATGPT_TOKEN_URL,
  createChatGptPkce,
  hasChatGptPlanScope,
  isChatGptRedirectUrl,
  parseChatGptCallback,
  parseChatGptTokenResponse,
  randomUrlSafeToken,
  validateChatGptIdToken,
} from "@/ai/chatgpt/oauth";
import { CHATGPT_NOT_SIGNED_IN_MESSAGE } from "@/ai/settings";
import {
  storageLocalGetTyped,
  storageLocalRemove,
  storageLocalSet,
} from "@/background/storage";
import { isAllowedApiOrigin } from "@/constants/api-endpoints";
import {
  type ChatGptCredentials,
  type ChatGptSignInState,
  safeParseChatGptCredentials,
  safeParseChatGptSignInState,
} from "@/schemas/chatgpt";
import { debugLog } from "@/utils/debug_log";
import { toErrorMessage } from "@/utils/errors";
import { fetchWithTimeout } from "@/utils/fetch-with-timeout";
import { showErrorNotification, showNotification } from "@/utils/notifications";

const SIGN_IN_STATE_KEY = "chatgptSignIn";
const ACCESS_TOKEN_SKEW_MS = 60_000;
const REVOKE_BACKOFF_MS = [300, 900];

const SESSION_EXPIRED_MESSAGE =
  "ChatGPT のセッションが切れました。設定画面から再度サインインしてください";
const ACCOUNT_MISMATCH_MESSAGE =
  "前回と別の ChatGPT アカウントが選ばれました。もう一度サインインすると、このアカウント用に新しく登録します";
const PLAN_REQUIRED_MESSAGE =
  "このアカウントでは ChatGPT プランを利用できません（Plus / Pro が必要です）";

export type ChatGptAuthState = {
  status: "signedOut" | "pending" | "signedIn" | "failed";
  email: string | null;
  errorMessage: string | null;
};

type FormResponse = { status: number; json: unknown };

let generation = 0;
let queue: Promise<unknown> = Promise.resolve();
let startQueue: Promise<unknown> = Promise.resolve();
const completingTabIds = new Set<number>();

function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

async function readSignInState(): Promise<ChatGptSignInState | null> {
  const items = await chrome.storage.session.get(SIGN_IN_STATE_KEY);
  return safeParseChatGptSignInState(items[SIGN_IN_STATE_KEY]);
}

async function writeSignInState(state: ChatGptSignInState): Promise<void> {
  await chrome.storage.session.set({ [SIGN_IN_STATE_KEY]: state });
}

async function clearSignInState(): Promise<void> {
  await chrome.storage.session.remove(SIGN_IN_STATE_KEY);
}

async function readCredentials(): Promise<ChatGptCredentials | null> {
  const storage = await storageLocalGetTyped(["chatgptCredentials"]);
  return safeParseChatGptCredentials(storage.chatgptCredentials);
}

async function postForm(
  url: string,
  params: Record<string, string>
): Promise<Result.Result<FormResponse, string>> {
  if (!isAllowedApiOrigin(url)) {
    return Result.fail(
      `セキュリティエラー: 許可されていないAPIエンドポイント (${new URL(url).origin})`
    );
  }
  try {
    const response = await fetchWithTimeout(fetch, url, {
      body: new URLSearchParams(params).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return Result.succeed({ json, status: response.status });
  } catch (error) {
    return Result.fail(toErrorMessage(error, "ChatGPT への接続に失敗しました"));
  }
}

export async function getChatGptAuthState(): Promise<ChatGptAuthState> {
  const state = await readSignInState();
  const credentials = await readCredentials();
  if (credentials) {
    return {
      email: credentials.email,
      errorMessage: state?.status === "failed" ? state.message : null,
      status: "signedIn",
    };
  }
  if (state?.status === "pending") {
    return { email: null, errorMessage: null, status: "pending" };
  }
  if (state?.status === "failed") {
    return { email: null, errorMessage: state.message, status: "failed" };
  }
  return { email: null, errorMessage: null, status: "signedOut" };
}

async function tabExists(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

async function ensureHostId(stored: string | undefined): Promise<string> {
  if (stored) {
    return stored;
  }
  const hostId = `urn:uuid:${crypto.randomUUID()}`;
  await storageLocalSet({ chatgptHostId: hostId });
  return hostId;
}

async function openSignInTab(): Promise<Result.Result<void, string>> {
  const storage = await storageLocalGetTyped([
    "chatgptCredentials",
    "chatgptClientId",
    "chatgptHostId",
  ]);
  const hostId = await ensureHostId(storage.chatgptHostId);
  const clientId = storage.chatgptClientId ?? null;
  const credentials = safeParseChatGptCredentials(storage.chatgptCredentials);
  const pkce = await createChatGptPkce();
  const state = randomUrlSafeToken(16);
  const nonce = randomUrlSafeToken(16);

  const url = buildChatGptAuthorizeUrl({
    clientId,
    codeChallenge: pkce.challenge,
    hostId,
    idTokenHint: credentials?.idToken ?? null,
    loginHint: credentials?.email ?? null,
    nonce,
    state,
  });
  const tab = await chrome.tabs.create({ url: "about:blank" });
  const tabId = tab.id;
  if (tabId === undefined) {
    return Result.fail("サインイン用のタブを開けませんでした");
  }
  await writeSignInState({
    clientId,
    nonce,
    state,
    status: "pending",
    tabId,
    verifier: pkce.verifier,
  });
  try {
    await chrome.tabs.update(tabId, { url });
  } catch (error) {
    await clearSignInState();
    await closeSignInTab(tabId);
    return Result.fail(
      toErrorMessage(error, "サインイン画面へ移動できませんでした")
    );
  }
  return Result.succeed();
}

async function startOrFocusSignIn(): Promise<Result.Result<void, string>> {
  try {
    const current = await readSignInState();
    if (current?.status === "pending" && (await tabExists(current.tabId))) {
      await chrome.tabs.update(current.tabId, { active: true });
      return Result.succeed();
    }
    return await openSignInTab();
  } catch (error) {
    return Result.fail(
      toErrorMessage(error, "サインインを開始できませんでした")
    );
  }
}

export function startChatGptSignIn(): Promise<Result.Result<void, string>> {
  const run = startQueue.then(startOrFocusSignIn);
  startQueue = run.catch(() => undefined);
  return run;
}

type PendingSignIn = Extract<ChatGptSignInState, { status: "pending" }>;

type ExchangeOutcome =
  | { kind: "signedIn"; email: string | null }
  | { kind: "cancelled" };

type PersistResult =
  | { kind: "saved"; replaced: ChatGptCredentials | null }
  | { kind: "cancelled" }
  | { kind: "accountMismatch" };

async function rejectAndRevoke(
  grant: { clientId: string; refreshToken: string },
  message: string
): Promise<Result.Result<never, string>> {
  await revokeRefreshToken(grant);
  return Result.fail(message);
}

function persistSignedInCredentials(
  credentials: ChatGptCredentials,
  startGeneration: number
): Promise<PersistResult> {
  return exclusive(async () => {
    if (startGeneration !== generation) {
      return { kind: "cancelled" };
    }
    const storage = await storageLocalGetTyped([
      "chatgptClientSubject",
      "chatgptCredentials",
    ]);
    const knownSubject = storage.chatgptClientSubject;
    if (knownSubject !== undefined && knownSubject !== credentials.subject) {
      await storageLocalRemove(["chatgptClientId", "chatgptClientSubject"]);
      return { kind: "accountMismatch" };
    }
    await storageLocalSet({
      chatgptClientId: credentials.clientId,
      chatgptClientSubject: credentials.subject,
      chatgptCredentials: credentials,
    });
    const previous = safeParseChatGptCredentials(storage.chatgptCredentials);
    return {
      kind: "saved",
      replaced:
        previous && previous.refreshToken !== credentials.refreshToken
          ? previous
          : null,
    };
  });
}

async function exchangeAuthorizationCode(
  pending: PendingSignIn,
  url: string,
  startGeneration: number
): Promise<Result.Result<ExchangeOutcome, string>> {
  const callback = parseChatGptCallback(url, {
    clientId: pending.clientId,
    state: pending.state,
  });
  if (Result.isFailure(callback)) {
    return Result.fail(callback.error);
  }
  const { clientId, code } = callback.value;

  const response = await postForm(CHATGPT_TOKEN_URL, {
    client_id: clientId,
    code,
    code_verifier: pending.verifier,
    grant_type: "authorization_code",
    redirect_uri: CHATGPT_REDIRECT_URI,
    resource: CHATGPT_RESOURCE,
  });
  if (Result.isFailure(response)) {
    return Result.fail(response.error);
  }
  const tokens = parseChatGptTokenResponse(
    response.value.status,
    response.value.json
  );
  if (Result.isFailure(tokens)) {
    return Result.fail(tokens.error.message);
  }
  const { value: tokenSet } = tokens;
  const grant = { clientId, refreshToken: tokenSet.refreshToken };
  if (tokenSet.scope === null || !hasChatGptPlanScope(tokenSet.scope)) {
    return rejectAndRevoke(grant, PLAN_REQUIRED_MESSAGE);
  }
  if (tokenSet.idToken === null) {
    return rejectAndRevoke(
      grant,
      "ChatGPT のトークン応答に ID トークンが含まれていません"
    );
  }

  const now = Date.now();
  const identity = validateChatGptIdToken(tokenSet.idToken, {
    clientId,
    nonce: pending.nonce,
    nowMs: now,
  });
  if (Result.isFailure(identity)) {
    return rejectAndRevoke(grant, identity.error);
  }

  const persisted = await persistSignedInCredentials(
    {
      accessToken: tokenSet.accessToken,
      clientId,
      email: identity.value.email,
      expiresAt: now + tokenSet.expiresIn * 1000,
      idToken: tokenSet.idToken,
      refreshToken: tokenSet.refreshToken,
      scope: tokenSet.scope,
      subject: identity.value.subject,
    },
    startGeneration
  );
  if (persisted.kind === "saved") {
    if (persisted.replaced) {
      await revokeRefreshToken(persisted.replaced);
    }
    return Result.succeed({ email: identity.value.email, kind: "signedIn" });
  }
  await revokeRefreshToken(grant);
  if (persisted.kind === "cancelled") {
    return Result.succeed({ kind: "cancelled" });
  }
  return Result.fail(ACCOUNT_MISMATCH_MESSAGE);
}

async function closeSignInTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    await debugLog(
      "chatgpt_session",
      "Failed to close sign-in tab",
      { error: toErrorMessage(error, "unknown") },
      "warn"
    );
  }
}

function ifAttemptStillCurrent(
  attemptState: string,
  action: () => Promise<void>
): Promise<void> {
  return exclusive(async () => {
    const current = await readSignInState();
    if (current?.status === "pending" && current.state === attemptState) {
      await action();
    }
  });
}

async function completeSignIn(
  pending: PendingSignIn,
  url: string,
  startGeneration: number
): Promise<void> {
  let outcome: Result.Result<ExchangeOutcome, string>;
  try {
    outcome = await exchangeAuthorizationCode(pending, url, startGeneration);
  } catch (error) {
    outcome = Result.fail(toErrorMessage(error, "サインインに失敗しました"));
  }

  if (Result.isSuccess(outcome)) {
    const { value } = outcome;
    if (value.kind === "signedIn") {
      await ifAttemptStillCurrent(pending.state, async () => {
        await clearSignInState();
        await showNotification({
          message: value.email ?? "ChatGPT プランを利用できます",
          title: "ChatGPT にサインインしました",
        });
      });
    }
  } else if (startGeneration === generation) {
    await ifAttemptStillCurrent(pending.state, async () => {
      await writeSignInState({ message: outcome.error, status: "failed" });
      await showErrorNotification({
        errorMessage: outcome.error,
        title: "ChatGPT へのサインインに失敗しました",
      });
    });
  }
  await closeSignInTab(pending.tabId);
}

export async function handleChatGptTabUpdated(
  tabId: number,
  url: string | undefined
): Promise<void> {
  if (!(url && isChatGptRedirectUrl(url)) || completingTabIds.has(tabId)) {
    return;
  }
  completingTabIds.add(tabId);
  const startGeneration = generation;
  try {
    const pending = await readSignInState();
    if (pending?.status !== "pending" || pending.tabId !== tabId) {
      return;
    }
    await completeSignIn(pending, url, startGeneration);
  } finally {
    completingTabIds.delete(tabId);
  }
}

export async function handleChatGptTabRemoved(tabId: number): Promise<void> {
  const pending = await readSignInState();
  if (pending?.status === "pending" && pending.tabId === tabId) {
    await clearSignInState();
  }
}

function isFresh(credentials: ChatGptCredentials): boolean {
  return credentials.expiresAt - ACCESS_TOKEN_SKEW_MS > Date.now();
}

async function refreshCredentials(
  credentials: ChatGptCredentials
): Promise<Result.Result<string, string>> {
  const response = await postForm(CHATGPT_TOKEN_URL, {
    client_id: credentials.clientId,
    grant_type: "refresh_token",
    refresh_token: credentials.refreshToken,
    resource: CHATGPT_RESOURCE,
  });
  if (Result.isFailure(response)) {
    return Result.fail(response.error);
  }
  const tokens = parseChatGptTokenResponse(
    response.value.status,
    response.value.json
  );
  if (Result.isFailure(tokens)) {
    if (tokens.error.requiresReauth) {
      await storageLocalRemove("chatgptCredentials");
      return Result.fail(SESSION_EXPIRED_MESSAGE);
    }
    return Result.fail(tokens.error.message);
  }

  const { value: tokenSet } = tokens;
  const scope = tokenSet.scope ?? credentials.scope;
  if (!hasChatGptPlanScope(scope)) {
    await revokeRefreshToken({
      clientId: credentials.clientId,
      refreshToken: tokenSet.refreshToken,
    });
    await storageLocalRemove("chatgptCredentials");
    return Result.fail(PLAN_REQUIRED_MESSAGE);
  }
  const renewed: ChatGptCredentials = {
    ...credentials,
    accessToken: tokenSet.accessToken,
    expiresAt: Date.now() + tokenSet.expiresIn * 1000,
    idToken: tokenSet.idToken ?? credentials.idToken,
    refreshToken: tokenSet.refreshToken,
    scope,
  };
  await storageLocalSet({ chatgptCredentials: renewed });
  return Result.succeed(renewed.accessToken);
}

export function getChatGptAccessToken(options?: {
  forceRefresh?: boolean;
  staleAccessToken?: string;
}): Promise<Result.Result<string, string>> {
  const requestedGeneration = generation;
  return exclusive(async () => {
    try {
      if (requestedGeneration !== generation) {
        return Result.fail(CHATGPT_NOT_SIGNED_IN_MESSAGE);
      }
      const credentials = await readCredentials();
      if (!credentials) {
        return Result.fail(CHATGPT_NOT_SIGNED_IN_MESSAGE);
      }
      const alreadyRenewed =
        options?.staleAccessToken !== undefined &&
        credentials.accessToken !== options.staleAccessToken;
      const reusable = alreadyRenewed || !options?.forceRefresh;
      if (reusable && isFresh(credentials)) {
        return Result.succeed(credentials.accessToken);
      }
      return await refreshCredentials(credentials);
    } catch (error) {
      return Result.fail(
        toErrorMessage(error, "ChatGPT のトークン更新に失敗しました")
      );
    }
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function revokeRefreshToken(
  credentials: { clientId: string; refreshToken: string },
  attempt = 0
): Promise<boolean> {
  const response = await postForm(CHATGPT_REVOKE_URL, {
    client_id: credentials.clientId,
    token: credentials.refreshToken,
    token_type_hint: "refresh_token",
  });
  if (Result.isSuccess(response)) {
    const { status } = response.value;
    if (status >= 200 && status < 300) {
      return true;
    }
    if (status < 500) {
      return false;
    }
  }
  const backoff = REVOKE_BACKOFF_MS[attempt];
  if (backoff === undefined) {
    return false;
  }
  await delay(backoff);
  return revokeRefreshToken(credentials, attempt + 1);
}

export async function signOutChatGpt(): Promise<
  Result.Result<{ revokeConfirmed: boolean }, string>
> {
  generation += 1;
  try {
    const credentials = await exclusive(async () => {
      const stored = await readCredentials();
      await storageLocalRemove("chatgptCredentials");
      await clearSignInState();
      return stored;
    });
    if (!credentials) {
      return Result.succeed({ revokeConfirmed: true });
    }
    return Result.succeed({
      revokeConfirmed: await revokeRefreshToken(credentials),
    });
  } catch (error) {
    return Result.fail(toErrorMessage(error, "サインアウトに失敗しました"));
  }
}
