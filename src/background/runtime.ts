import { runtimeHandlers } from "@/background/runtime_handlers";
import type {
  RuntimeRequest,
  RuntimeSendResponse,
} from "@/background/runtime_types";

export type {
  ClearDebugLogsResponse,
  DownloadDebugLogsResponse,
  TestOpenAiTokenResponse,
} from "@/background/runtime_types";

export function registerRuntimeMessageHandlers(): void {
  chrome.runtime.onMessage.addListener(
    (
      request: RuntimeRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: RuntimeSendResponse
    ) => {
      const handler =
        runtimeHandlers[request.action as keyof typeof runtimeHandlers];
      if (!handler) {
        return true;
      }
      return handler(request as never, sendResponse);
    }
  );
}
