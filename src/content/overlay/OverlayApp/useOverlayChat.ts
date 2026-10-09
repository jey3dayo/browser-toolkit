import { useLayoutEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/background/runtime_types";
import { t } from "@/i18n";
import { isRecord } from "@/utils/guards";

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
  }
  useLayoutEffect(() => {
    chatRequestIdRef.current += 1;
  }, [primary]);

  const handleChatSend = (text: string): void => {
    if (!text.trim() || isChatting) {
      return;
    }
    chatRequestIdRef.current += 1;
    const requestId = chatRequestIdRef.current;
    const userMessage: ChatMessage = { content: text.trim(), role: "user" };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setIsChatting(true);

    chrome.runtime
      .sendMessage({
        action: "chatFollowUp",
        context: primary,
        messages: nextMessages,
      })
      .then((response: unknown) => {
        if (requestId !== chatRequestIdRef.current) {
          return;
        }
        const replyText =
          isRecord(response) &&
          response.type === "Success" &&
          isRecord(response.value) &&
          typeof response.value.text === "string"
            ? response.value.text
            : "";
        if (replyText) {
          setChatMessages((prev) => [
            ...prev,
            { content: replyText, role: "assistant" },
          ]);
        } else {
          const errorMsg =
            isRecord(response) &&
            response.type === "Failure" &&
            typeof response.error === "string"
              ? response.error
              : t("content.overlay.chatResponseFailed");
          setChatMessages((prev) => [
            ...prev,
            {
              content: t("content.overlay.errorPrefix", { message: errorMsg }),
              role: "assistant",
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
            content: t("content.overlay.errorPrefix", {
              message: t("content.overlay.chatFailed"),
            }),
            role: "assistant",
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

  return { chatMessages, handleChatSend, isChatting };
}
