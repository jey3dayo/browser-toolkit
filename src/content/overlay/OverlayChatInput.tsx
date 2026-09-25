import { MessageScroller } from "@shadcn/react/message-scroller";
import { useCallback, useState } from "react";
import type { ChatMessage } from "@/background/runtime_types";
import { Icon } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/shared/Textarea";
import { TextOutput } from "@/components/shared/TextOutput";
import { t } from "@/i18n";
import { OverlayProgressStatus } from "./OverlayProgressStatus";
import { overlayClassNames } from "./overlayClassNames";

/**
 * Chat input component for inline follow-up questions
 */
function createKeyedChatMessages(
  messages: ChatMessage[]
): { key: string; message: ChatMessage; messageId: string }[] {
  const occurrenceCounts = new Map<string, number>();

  return messages.map((message, index) => {
    const signature = `${message.role}:${message.content}`;
    const occurrence = occurrenceCounts.get(signature) ?? 0;
    occurrenceCounts.set(signature, occurrence + 1);

    return {
      key: `${signature}:${occurrence}`,
      message,
      messageId: `overlay-chat-message-${index}`,
    };
  });
}

type OverlayChatInputProps = {
  chatMessages: ChatMessage[];
  isChatting: boolean;
  onSend: (text: string) => void;
};

export function OverlayChatInput(
  props: OverlayChatInputProps
): React.JSX.Element {
  const [input, setInput] = useState("");
  const keyedChatMessages = createKeyedChatMessages(props.chatMessages);

  const handleSend = useCallback((): void => {
    const text = input.trim();
    if (!text || props.isChatting) {
      return;
    }
    props.onSend(text);
    setInput("");
  }, [input, props.isChatting, props.onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setInput(e.target.value);
    },
    []
  );

  return (
    <div className={overlayClassNames.chat}>
      {props.chatMessages.length > 0 ? (
        <MessageScroller.Provider
          autoScroll
          defaultScrollPosition="last-anchor"
          scrollPreviousItemPeek={24}
        >
          <MessageScroller.Root className={overlayClassNames.chatScrollerRoot}>
            <MessageScroller.Viewport
              aria-label={t("overlay.chat.transcriptLabel")}
              className={overlayClassNames.chatScrollerViewport}
            >
              <MessageScroller.Content
                aria-busy={props.isChatting}
                className={overlayClassNames.chatMessages}
                spacerClassName={overlayClassNames.chatScrollerSpacer}
              >
                {keyedChatMessages.map(({ key, message, messageId }) => (
                  <MessageScroller.Item
                    className={overlayClassNames.chatScrollerItem}
                    key={key}
                    messageId={messageId}
                    scrollAnchor={message.role === "user"}
                  >
                    <div
                      className={overlayClassNames.chatMessage(message.role)}
                    >
                      <span
                        className={
                          message.role === "user"
                            ? [
                                overlayClassNames.chatRole,
                                overlayClassNames.visuallyHidden,
                              ].join(" ")
                            : overlayClassNames.chatRole
                        }
                      >
                        {message.role === "user"
                          ? t("overlay.chat.user")
                          : t("overlay.chat.assistant")}
                      </span>
                      <TextOutput variant="overlayChatText">
                        {message.content}
                      </TextOutput>
                    </div>
                  </MessageScroller.Item>
                ))}
                {props.isChatting ? (
                  <MessageScroller.Item
                    className={overlayClassNames.chatScrollerItem}
                    messageId="overlay-chat-thinking"
                  >
                    <div className={overlayClassNames.chatMessage("assistant")}>
                      <span className={overlayClassNames.chatRole}>
                        {t("overlay.chat.assistant")}
                      </span>
                      <div className={overlayClassNames.status}>
                        <OverlayProgressStatus
                          label={t("overlay.chat.thinking")}
                        />
                      </div>
                    </div>
                  </MessageScroller.Item>
                ) : null}
              </MessageScroller.Content>
            </MessageScroller.Viewport>
            <MessageScroller.Button
              aria-label={t("overlay.chat.jumpToLatest")}
              className={overlayClassNames.chatScrollerButton}
              direction="end"
              title={t("overlay.chat.jumpToLatest")}
              type="button"
            >
              <Icon aria-hidden="true" name="chevron-down" size={14} />
            </MessageScroller.Button>
          </MessageScroller.Root>
        </MessageScroller.Provider>
      ) : null}
      <div className={overlayClassNames.chatInputRow}>
        <Textarea
          disabled={props.isChatting}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={t("overlay.chat.placeholder")}
          rows={2}
          value={input}
          variant="overlayChat"
        />
        <div className={overlayClassNames.chatComposerActions}>
          <Button
            aria-label={t("overlay.chat.send")}
            disabled={!input.trim() || props.isChatting}
            onClick={handleSend}
            title={t("overlay.chat.send")}
            type="button"
            variant="overlayIcon"
          >
            <Icon aria-hidden="true" name="arrow-up" size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
