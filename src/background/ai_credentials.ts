import { Result } from "@praha/byethrow";
import type { ChatRequestBody } from "@/ai/adapter";
import {
  fetchChatCompletionOk,
  fetchChatCompletionText,
} from "@/ai/chat-completion-client";
import {
  fetchChatGptResponsesText,
  formatChatGptResponsesError,
} from "@/ai/chatgpt/responses";
import { getAdapter } from "@/ai/get-adapter";
import type { AiSettings } from "@/ai/settings";
import { getChatGptAccessToken } from "@/background/chatgpt_session";

async function requestChatGptText(
  body: ChatRequestBody,
  emptyContentMessage: string
): Promise<Result.Result<string, string>> {
  const send = (token: string) =>
    fetchChatGptResponsesText(fetch, token, body, emptyContentMessage);

  const accessToken = await getChatGptAccessToken();
  if (Result.isFailure(accessToken)) {
    return Result.fail(accessToken.error);
  }

  let result = await send(accessToken.value);
  if (Result.isFailure(result) && result.error.status === 401) {
    const refreshed = await getChatGptAccessToken({ forceRefresh: true });
    if (Result.isFailure(refreshed)) {
      return Result.fail(refreshed.error);
    }
    result = await send(refreshed.value);
  }

  if (Result.isFailure(result)) {
    return Result.fail(formatChatGptResponsesError(result.error));
  }
  return Result.succeed(result.value);
}

export function requestAiCompletionText(
  settings: AiSettings,
  body: ChatRequestBody,
  emptyContentMessage: string
): Promise<Result.Result<string, string>> {
  if (settings.provider === "chatgpt") {
    return requestChatGptText(body, emptyContentMessage);
  }
  return fetchChatCompletionText(
    fetch,
    getAdapter(settings.provider),
    settings.token,
    body,
    emptyContentMessage
  );
}

export async function requestAiCompletionOk(
  settings: AiSettings,
  body: ChatRequestBody
): Promise<Result.Result<void, string>> {
  if (settings.provider === "chatgpt") {
    const result = await requestChatGptText(body, "応答が空でした");
    return Result.isFailure(result)
      ? Result.fail(result.error)
      : Result.succeed();
  }
  return fetchChatCompletionOk(
    fetch,
    getAdapter(settings.provider),
    settings.token,
    body
  );
}
