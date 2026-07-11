import { Result } from "@praha/byethrow";
import { runtimeHandlers } from "@/background/runtime_handlers";
import type {
  RuntimeRequest,
  RuntimeSendResponse,
} from "@/background/runtime_types";
import { t } from "@/i18n";

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
        sendResponse(Result.fail(t("background.runtime.unknownAction")));
        return false;
      }
      return handler(request as never, sendResponse);
    }
  );
}
