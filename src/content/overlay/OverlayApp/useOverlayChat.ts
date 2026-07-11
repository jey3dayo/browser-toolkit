import { Result } from "@praha/byethrow";
import { useRef, useState } from "react";
import type {
  ChatFollowUpResponse,
  ChatMessage,
} from "@/background/runtime_types";
import { t } from "@/i18n";

/**
 * Manage overlay chat follow-up state: message history, in-flight request
 * tracking, and reset when the underlying AI result (primary text) changes.
 */
export function useOverlayChat(primary: string) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatRequestIdRef = useRef(0);
  const [prevPrimary, setPrevPrimary] = useState(primary);

  // Reset chat state when AI result changes to a new context. Adjusting
  // state during render (rather than in an effect) avoids an extra
  // render pass; see https://react.dev/learn/you-might-not-need-an-effect
  if (primary !== prevPrimary) {
    setPrevPrimary(primary);
    setChatMessages([]);
    setIsChatting(false);
    chatRequestIdRef.current += 1;
  }

  const handleChatSend = (text: string): void => {
    if (!text.trim() || isChatting) {
      return;
    }
    const requestId = ++chatRequestIdRef.current;
    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setIsChatting(true);

    chrome.runtime
      .sendMessage({
        action: "chatFollowUp",
        messages: nextMessages,
        context: primary,
      })
      .then((response: unknown) => {
        if (requestId !== chatRequestIdRef.current) {
          return;
        }
        const res = response as ChatFollowUpResponse | undefined;
        if (res && Result.isSuccess(res) && res.value.text) {
          setChatMessages((prev) => [
            ...prev,
            { role: "assistant", content: res.value.text },
          ]);
        } else {
          const errorMsg =
            res && Result.isFailure(res)
              ? res.error
              : t("content.overlay.chatResponseFailed");
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: t("content.overlay.errorPrefix", { message: errorMsg }),
            },
          ]);
        }
      })
      .catch(() => {
        if (requestId !== chatRequestIdRef.current) {
          return;
        }
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: t("content.overlay.errorPrefix", {
              message: t("content.overlay.chatFailed"),
            }),
          },
        ]);
      })
      .finally(() => {
        if (requestId !== chatRequestIdRef.current) {
          return;
        }
        setIsChatting(false);
      });
  };

  return { chatMessages, isChatting, handleChatSend };
}
