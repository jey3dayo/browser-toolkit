/**
 * Sign in with ChatGPT（ChatGPT プラン利用）の永続データスキーマ
 *
 * @see https://developers.openai.com/siwc/token-sharing-open-source/sign-in
 */
import {
  type InferOutput,
  literal,
  nullable,
  number,
  object,
  safeParse,
  string,
  variant,
} from "valibot";

export const ChatGptCredentialsSchema = object({
  accessToken: string(),
  clientId: string(),
  email: nullable(string()),
  /** epoch ms */
  expiresAt: number(),
  idToken: string(),
  refreshToken: string(),
  scope: string(),
  subject: string(),
});

export type ChatGptCredentials = InferOutput<typeof ChatGptCredentialsSchema>;

/** 認可タブの操作中に service worker が止まっても完了できるよう chrome.storage.session に置く */
export const ChatGptSignInStateSchema = variant("status", [
  object({
    clientId: nullable(string()),
    nonce: string(),
    state: string(),
    status: literal("pending"),
    tabId: number(),
    verifier: string(),
  }),
  object({
    message: string(),
    status: literal("failed"),
  }),
]);

export type ChatGptSignInState = InferOutput<typeof ChatGptSignInStateSchema>;

export function safeParseChatGptCredentials(
  value: unknown
): ChatGptCredentials | null {
  const result = safeParse(ChatGptCredentialsSchema, value);
  return result.success ? result.output : null;
}

export function safeParseChatGptSignInState(
  value: unknown
): ChatGptSignInState | null {
  const result = safeParse(ChatGptSignInStateSchema, value);
  return result.success ? result.output : null;
}
