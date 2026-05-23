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
import type { ExtractedEvent } from "@/shared_types";
import type { Theme } from "@/ui/theme";
import type { OverlayViewModel } from "./OverlayApp";
import { overlayClassNames } from "./overlayClassNames";

/**
 * Copy button component
 */
export type OverlayCopyButtonProps = {
  disabled: boolean;
  onCopy: () => void;
};

export function OverlayCopyButton(
  props: OverlayCopyButtonProps
): React.JSX.Element {
  return (
    <Button
      aria-label="コピー"
      data-testid="overlay-copy"
      disabled={props.disabled}
      onClick={props.onCopy}
      title="コピー"
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
export type OverlayPopoverProps = {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function OverlayPopover(props: OverlayPopoverProps): React.JSX.Element {
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
export type OverlayEventModeActionsProps = {
  canOpenCalendar: boolean;
  canDownloadIcs: boolean;
  canCopyPrimary: boolean;
  onOpenCalendar: () => void;
  onDownloadIcs: () => void;
  onCopyPrimary: () => void;
};

export function OverlayEventModeActions(
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
          Googleカレンダーに登録
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
export type OverlayEventDetailsProps = {
  event: ExtractedEvent;
  selectionText: string;
};

export function OverlayEventDetails(
  props: OverlayEventDetailsProps
): React.JSX.Element {
  return (
    <>
      <table className={overlayClassNames.eventTable}>
        <tbody>
          <tr>
            <th scope="row">タイトル</th>
            <td>{props.event.title}</td>
          </tr>
          <tr>
            <th scope="row">日時</th>
            <td>
              {props.event.end
                ? `${props.event.start} ～ ${props.event.end}`
                : props.event.start}
            </td>
          </tr>
          {props.event.location ? (
            <tr>
              <th scope="row">場所</th>
              <td>{props.event.location}</td>
            </tr>
          ) : null}
          {props.event.description ? (
            <tr>
              <th scope="row">概要</th>
              <td>{props.event.description}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <AuxTextDisclosure
        storageKey="overlaySelectionDisclosureOpen"
        summary="選択したテキスト"
        text={props.selectionText}
      />
    </>
  );
}

/**
 * Text mode details component
 */
export type OverlayTextDetailsProps = {
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

export function OverlayTextDetails(
  props: OverlayTextDetailsProps
): React.JSX.Element {
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
          aria-label="設定を開く"
          onClick={openSettings}
          title="設定を開く"
          type="button"
          variant="overlaySettingsLink"
        >
          <Icon name="settings" size={16} />
          設定を開く
        </Button>
      ) : null}
      {props.secondaryText ? (
        <TextOutput variant="overlaySecondaryText">
          {props.secondaryText}
        </TextOutput>
      ) : null}
      <AuxTextDisclosure
        storageKey="overlaySelectionDisclosureOpen"
        summary="選択したテキスト"
        text={props.selectionText}
      />
    </>
  );
}

/**
 * Overlay body component (combines text and event modes)
 */
export type OverlayBodyProps = OverlayTextDetailsProps & {
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
export type OverlayHeaderActionsProps = {
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
        ariaLabel={props.pinned ? "右上固定を解除" : "右上に固定"}
        description="右上に固定します。もう一度クリックで解除。"
        onClick={props.onTogglePinned}
        popoverId={props.pinPopoverId}
        testId="overlay-pin"
        title="ピン留め"
      >
        <PinIcon />
      </OverlayHeaderIconAction>
      <OverlayPopover
        description="自動・ライト・ダークを順に切り替えます。"
        id={props.themePopoverId}
        title="テーマ切り替え"
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
              ? "シンプル表示に切り替え"
              : "Markdown表示に切り替え"
          }
          description="Markdown表示とシンプル表示を切り替えます。"
          onClick={props.onToggleMarkdownView}
          popoverId={props.markdownPopoverId}
          testId="overlay-markdown"
          title="表示切り替え"
        >
          <Icon
            aria-hidden="true"
            name={props.markdownView ? "eye" : "eye-off"}
          />
        </OverlayHeaderIconAction>
      ) : null}
      <OverlayHeaderIconAction
        ariaLabel="閉じる"
        description="オーバーレイを閉じます。"
        onClick={props.onDismiss}
        popoverId={props.closePopoverId}
        testId="overlay-close"
        title="閉じる"
      >
        ×
      </OverlayHeaderIconAction>
    </div>
  );
}

/**
 * Chat input component for inline follow-up questions
 */
export type OverlayChatInputProps = {
  chatMessages: ChatMessage[];
  isChatting: boolean;
  onSend: (text: string) => void;
};

export function OverlayChatInput(
  props: OverlayChatInputProps
): React.JSX.Element {
  const [input, setInput] = useState("");

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
        <div className={overlayClassNames.chatMessages}>
          {props.chatMessages.map((msg, i) => (
            <div
              className={overlayClassNames.chatMessage(msg.role)}
              // biome-ignore lint/suspicious/noArrayIndexKey: chat messages are append-only
              key={i}
            >
              <span className={overlayClassNames.chatRole}>
                {msg.role === "user" ? "あなた" : "AI"}
              </span>
              <TextOutput variant="overlayChatText">{msg.content}</TextOutput>
            </div>
          ))}
          {props.isChatting ? (
            <div className={overlayClassNames.chatMessage("assistant")}>
              <span className={overlayClassNames.chatRole}>AI</span>
              <span className={overlayClassNames.status}>考え中...</span>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={overlayClassNames.chatInputRow}>
        <Textarea
          disabled={props.isChatting}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="フォローアップの質問を入力（Enter で送信）"
          rows={2}
          value={input}
          variant="overlayChat"
        />
        <Button
          disabled={!input.trim() || props.isChatting}
          onClick={handleSend}
          type="button"
          variant="overlay"
        >
          <Icon aria-hidden="true" name="message-square" size={16} />
        </Button>
      </div>
    </div>
  );
}
