import { Result } from "@praha/byethrow";
import {
  getChatGptAuthState,
  signOutChatGpt,
  startChatGptSignIn,
} from "@/background/chatgpt_session";
import type { RuntimeSendResponse } from "@/background/runtime_types";
import { debugLog } from "@/utils/debug_log";

async function failChatGptRequest(
  action: string,
  error: unknown,
  fallbackMessage: string,
  sendResponse: RuntimeSendResponse
): Promise<void> {
  await debugLog(
    "handleChatGptRequest",
    "ChatGPT request failed",
    { action, error },
    "error"
  );
  sendResponse(
    Result.fail(error instanceof Error ? error.message : fallbackMessage)
  );
}

function handleChatGptAuthStateRequest(
  _request: { action: "chatgptAuthState" },
  sendResponse: RuntimeSendResponse
): boolean {
  getChatGptAuthState()
    .then((state) => {
      sendResponse(Result.succeed(state));
    })
    .catch((error: unknown) =>
      failChatGptRequest(
        "chatgptAuthState",
        error,
        "ChatGPT のサインイン状態を取得できませんでした",
        sendResponse
      )
    );
  return true;
}

function handleChatGptSignInRequest(
  _request: { action: "chatgptSignIn" },
  sendResponse: RuntimeSendResponse
): boolean {
  startChatGptSignIn()
    .then((result) => {
      sendResponse(
        Result.isFailure(result)
          ? Result.fail(result.error)
          : Result.succeed({})
      );
    })
    .catch((error: unknown) =>
      failChatGptRequest(
        "chatgptSignIn",
        error,
        "サインインを開始できませんでした",
        sendResponse
      )
    );
  return true;
}

function handleChatGptSignOutRequest(
  _request: { action: "chatgptSignOut" },
  sendResponse: RuntimeSendResponse
): boolean {
  signOutChatGpt()
    .then((result) => {
      sendResponse(result);
    })
    .catch((error: unknown) =>
      failChatGptRequest(
        "chatgptSignOut",
        error,
        "サインアウトに失敗しました",
        sendResponse
      )
    );
  return true;
}

export const chatGptRuntimeHandlers = {
  chatgptAuthState: handleChatGptAuthStateRequest,
  chatgptSignIn: handleChatGptSignInRequest,
  chatgptSignOut: handleChatGptSignOutRequest,
} as const;
