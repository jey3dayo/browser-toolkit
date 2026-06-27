import { MessageScroller } from "@shadcn/react/message-scroller";
import { type ReactNode, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/background/runtime_types";
import { AuxTextDisclosure } from "@/components/AuxTextDisclosure";
import { Icon } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/shared/Textarea";
import { TextBlock } from "@/components/shared/TextBlock";
import { TextOutput } from "@/components/shared/TextOutput";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";
import { CopyIcon, PinIcon } from "@/content/overlay/icons";
import { t } from "@/i18n";
import type { ExtractedEvent } from "@/shared_types";
import type { Theme } from "@/ui/theme";
import type { OverlayViewModel } from "./OverlayApp";
import { overlayClassNames } from "./overlayClassNames";

/**
 * Copy button component
 */
type OverlayCopyButtonProps = {
  disabled: boolean;
  onCopy: () => void;
};

function OverlayCopyButton(props: OverlayCopyButtonProps): React.JSX.Element {
  return (
    <Button
      aria-label={t("overlay.actions.copy")}
      data-testid="overlay-copy"
      disabled={props.disabled}
      onClick={props.onCopy}
      title={t("overlay.actions.copy")}
      type="button"
      variant="overlayCopy"
    >
      <CopyIcon />
    </Button>
  );
}

/**
 * Popover component for tooltips
 */
type OverlayPopoverProps = {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function OverlayPopover(props: OverlayPopoverProps): React.JSX.Element {
  return (
    <div className={overlayClassNames.popover}>
      {props.children}
      <div
        className={overlayClassNames.popoverContent}
        id={props.id}
        role="tooltip"
      >
        <div className={overlayClassNames.popoverTitle}>{props.title}</div>
        <div className={overlayClassNames.popoverText}>{props.description}</div>
      </div>
    </div>
  );
}

/**
 * Event mode action buttons (Calendar, ICS, Copy)
 */
type OverlayEventModeActionsProps = {
  canOpenCalendar: boolean;
  canDownloadIcs: boolean;
  canCopyPrimary: boolean;
  onOpenCalendar: () => void;
  onDownloadIcs: () => void;
  onCopyPrimary: () => void;
};

function OverlayEventModeActions(
  props: OverlayEventModeActionsProps
): React.JSX.Element {
  return (
    <div className={overlayClassNames.bodyActions}>
      {props.canOpenCalendar ? (
        <Button
          disabled={!props.canOpenCalendar}
          onClick={props.onOpenCalendar}
          type="button"
          variant="overlay"
        >
          {t("overlay.actions.openGoogleCalendar")}
        </Button>
      ) : null}
      {props.canDownloadIcs ? (
        <Button
          disabled={!props.canDownloadIcs}
          onClick={props.onDownloadIcs}
          type="button"
          variant="overlay"
        >
          .ics
        </Button>
      ) : null}
      {props.canCopyPrimary ? (
        <OverlayCopyButton
          disabled={!props.canCopyPrimary}
          onCopy={props.onCopyPrimary}
        />
      ) : null}
    </div>
  );
}

/**
 * Event details table component
 */
type OverlayEventDetailsProps = {
  event: ExtractedEvent;
  selectionText: string;
};

function OverlayEventDetails(
  props: OverlayEventDetailsProps
): React.JSX.Element {
  return (
    <>
      <table className={overlayClassNames.eventTable}>
        <tbody>
          <tr>
            <th scope="row">{t("overlay.event.fields.title")}</th>
            <td>{props.event.title}</td>
          </tr>
          <tr>
            <th scope="row">{t("overlay.event.fields.datetime")}</th>
            <td>
              {props.event.end
                ? `${props.event.start} ～ ${props.event.end}`
                : props.event.start}
            </td>
          </tr>
          {props.event.location ? (
            <tr>
              <th scope="row">{t("overlay.event.fields.location")}</th>
              <td>{props.event.location}</td>
            </tr>
          ) : null}
          {props.event.description ? (
            <tr>
              <th scope="row">{t("overlay.event.fields.description")}</th>
              <td>{props.event.description}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <AuxTextDisclosure
        storageKey="overlaySelectionDisclosureOpen"
        summary={t("overlay.selectionText")}
        text={props.selectionText}
      />
    </>
  );
}

/**
 * Text mode details component
 */
type OverlayTextDetailsProps = {
  mode: OverlayViewModel["mode"];
  status: OverlayViewModel["status"];
  statusLabel: string;
  canCopyPrimary: boolean;
  primary: string;
  secondaryText: string;
  selectionText: string;
  markdownView: boolean;
  onCopyPrimary: () => void;
};

function OverlayTextDetails(props: OverlayTextDetailsProps): React.JSX.Element {
  const isTokenError =
    props.status === "error" &&
    (props.primary.includes("Token") ||
      props.primary.includes("トークン") ||
      props.primary.includes("未設定") ||
      props.primary.includes("API Key"));

  const openSettings = (): void => {
    chrome.runtime
      .sendMessage({ action: "openPopupSettings" })
      .catch((error) => {
        console.error("Failed to open settings:", error);
      });
  };

  const showCopyButton = props.mode !== "event" && props.canCopyPrimary;
  const primaryBlockClassName = [
    overlayClassNames.primaryBlock,
    showCopyButton ? overlayClassNames.primaryBlockCopy : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      {props.statusLabel ? (
        <div className={overlayClassNames.status}>{props.statusLabel}</div>
      ) : null}
      <div className={primaryBlockClassName}>
        {props.markdownView ? (
          <TextBlock
            className={overlayClassNames.primaryMarkdown}
            variant="overlayPrimaryText"
          >
            <ReactMarkdown
              components={{
                a: ({ children, node: _node, ...linkProps }) => (
                  <a {...linkProps} rel="noreferrer" target="_blank">
                    {children}
                  </a>
                ),
              }}
              remarkPlugins={[remarkGfm]}
            >
              {props.primary}
            </ReactMarkdown>
          </TextBlock>
        ) : (
          <TextOutput variant="overlayPrimaryText">{props.primary}</TextOutput>
        )}
        {showCopyButton ? (
          <OverlayCopyButton
            disabled={!props.canCopyPrimary}
            onCopy={props.onCopyPrimary}
          />
        ) : null}
      </div>
      {isTokenError ? (
        <Button
          aria-label={t("overlay.actions.openSettings")}
          onClick={openSettings}
          title={t("overlay.actions.openSettings")}
          type="button"
          variant="overlaySettingsLink"
        >
          <Icon name="settings" size={16} />
          {t("overlay.actions.openSettings")}
        </Button>
      ) : null}
      {props.secondaryText ? (
        <TextOutput variant="overlaySecondaryText">
          {props.secondaryText}
        </TextOutput>
      ) : null}
      <AuxTextDisclosure
        storageKey="overlaySelectionDisclosureOpen"
        summary={t("overlay.selectionText")}
        text={props.selectionText}
      />
    </>
  );
}

/**
 * Overlay body component (combines text and event modes)
 */
type OverlayBodyProps = OverlayTextDetailsProps & {
  readyEvent: ExtractedEvent | null;
  canOpenCalendar: boolean;
  canDownloadIcs: boolean;
  onOpenCalendar: () => void;
  onDownloadIcs: () => void;
};

export function OverlayBody(props: OverlayBodyProps): React.JSX.Element {
  return (
    <div className={overlayClassNames.body}>
      {props.mode === "event" ? (
        <OverlayEventModeActions
          canCopyPrimary={props.canCopyPrimary}
          canDownloadIcs={props.canDownloadIcs}
          canOpenCalendar={props.canOpenCalendar}
          onCopyPrimary={props.onCopyPrimary}
          onDownloadIcs={props.onDownloadIcs}
          onOpenCalendar={props.onOpenCalendar}
        />
      ) : null}

      {props.readyEvent ? (
        <OverlayEventDetails
          event={props.readyEvent}
          selectionText={props.selectionText}
        />
      ) : (
        <OverlayTextDetails
          canCopyPrimary={props.canCopyPrimary}
          markdownView={props.markdownView}
          mode={props.mode}
          onCopyPrimary={props.onCopyPrimary}
          primary={props.primary}
          secondaryText={props.secondaryText}
          selectionText={props.selectionText}
          status={props.status}
          statusLabel={props.statusLabel}
        />
      )}
    </div>
  );
}

/**
 * Overlay header actions component (pin, theme, markdown, close buttons)
 */
type OverlayHeaderActionsProps = {
  pinPopoverId: string;
  themePopoverId: string;
  markdownPopoverId: string;
  closePopoverId: string;
  pinned: boolean;
  theme: Theme;
  markdownView: boolean;
  showMarkdownToggle: boolean;
  onTogglePinned: () => void;
  onToggleTheme: () => void;
  onToggleMarkdownView: () => void;
  onDismiss: () => void;
};

type OverlayHeaderIconActionProps = {
  active?: boolean;
  ariaLabel: string;
  children: ReactNode;
  description: string;
  onClick: () => void;
  popoverId: string;
  testId: string;
  title: string;
};

function OverlayHeaderIconAction(
  props: OverlayHeaderIconActionProps
): React.JSX.Element {
  return (
    <OverlayPopover
      description={props.description}
      id={props.popoverId}
      title={props.title}
    >
      <Button
        aria-describedby={props.popoverId}
        aria-label={props.ariaLabel}
        data-active={props.active ? "true" : undefined}
        data-testid={props.testId}
        onClick={props.onClick}
        title={props.ariaLabel}
        type="button"
        variant="overlayIcon"
      >
        {props.children}
      </Button>
    </OverlayPopover>
  );
}

export function OverlayHeaderActions(
  props: OverlayHeaderActionsProps
): React.JSX.Element {
  return (
    <div className={overlayClassNames.actions}>
      <OverlayHeaderIconAction
        active={props.pinned}
        ariaLabel={
          props.pinned
            ? t("overlay.pin.unpinAriaLabel")
            : t("overlay.pin.pinAriaLabel")
        }
        description={t("overlay.pin.description")}
        onClick={props.onTogglePinned}
        popoverId={props.pinPopoverId}
        testId="overlay-pin"
        title={t("overlay.pin.title")}
      >
        <PinIcon />
      </OverlayHeaderIconAction>
      <OverlayPopover
        description={t("overlay.theme.description")}
        id={props.themePopoverId}
        title={t("overlay.theme.title")}
      >
        <ThemeCycleButton
          active={false}
          className="mbu-overlay-action mbu-overlay-icon-button"
          describedById={props.themePopoverId}
          onToggle={props.onToggleTheme}
          testId="overlay-theme"
          theme={props.theme}
        />
      </OverlayPopover>
      {props.showMarkdownToggle ? (
        <OverlayHeaderIconAction
          active={props.markdownView}
          ariaLabel={
            props.markdownView
              ? t("overlay.markdown.toSimple")
              : t("overlay.markdown.toMarkdown")
          }
          description={t("overlay.markdown.description")}
          onClick={props.onToggleMarkdownView}
          popoverId={props.markdownPopoverId}
          testId="overlay-markdown"
          title={t("overlay.markdown.title")}
        >
          <Icon
            aria-hidden="true"
            name={props.markdownView ? "eye" : "eye-off"}
          />
        </OverlayHeaderIconAction>
      ) : null}
      <OverlayHeaderIconAction
        ariaLabel={t("common.close")}
        description={t("overlay.close.description")}
        onClick={props.onDismiss}
        popoverId={props.closePopoverId}
        testId="overlay-close"
        title={t("common.close")}
      >
        <Icon aria-hidden="true" name="close" />
      </OverlayHeaderIconAction>
    </div>
  );
}

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

  const handleSend = (): void => {
    const text = input.trim();
    if (!text || props.isChatting) {
      return;
    }
    props.onSend(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
                      <span className={overlayClassNames.chatRole}>
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
                      <span className={overlayClassNames.status}>
                        {t("overlay.chat.thinking")}
                      </span>
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
          onChange={(e) => {
            setInput(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("overlay.chat.placeholder")}
          rows={2}
          value={input}
          variant="overlayChat"
        />
        <Button
          aria-label={t("overlay.chat.send")}
          disabled={!input.trim() || props.isChatting}
          onClick={handleSend}
          title={t("overlay.chat.send")}
          type="button"
          variant="overlayIcon"
        >
          <Icon aria-hidden="true" name="message-square" size={16} />
        </Button>
      </div>
    </div>
  );
}
