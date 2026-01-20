import { Button } from "@base-ui/react/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AuxTextDisclosure } from "@/components/AuxTextDisclosure";
import { Icon } from "@/components/icon";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";
import { CopyIcon, PinIcon } from "@/content/overlay/icons";
import type { ExtractedEvent } from "@/shared_types";
import type { Theme } from "@/ui/theme";
import type { OverlayViewModel } from "./OverlayApp";

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
      className="mbu-overlay-action mbu-overlay-icon-button mbu-overlay-copy"
      data-testid="overlay-copy"
      disabled={props.disabled}
      onClick={props.onCopy}
      title="コピー"
      type="button"
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
    <div className="mbu-overlay-popover">
      {props.children}
      <div className="mbu-overlay-popover-content" id={props.id} role="tooltip">
        <div className="mbu-overlay-popover-title">{props.title}</div>
        <div className="mbu-overlay-popover-text">{props.description}</div>
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
    <div className="mbu-overlay-body-actions">
      {props.canOpenCalendar ? (
        <Button
          className="mbu-overlay-action"
          disabled={!props.canOpenCalendar}
          onClick={props.onOpenCalendar}
          type="button"
        >
          Googleカレンダーに登録
        </Button>
      ) : null}
      {props.canDownloadIcs ? (
        <Button
          className="mbu-overlay-action"
          disabled={!props.canDownloadIcs}
          onClick={props.onDownloadIcs}
          type="button"
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
      <table className="mbu-overlay-event-table">
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
    "mbu-overlay-primary-block",
    showCopyButton ? "mbu-overlay-primary-block--copy" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      {props.statusLabel ? (
        <div className="mbu-overlay-status">{props.statusLabel}</div>
      ) : null}
      <div className={primaryBlockClassName}>
        {props.markdownView ? (
          <div className="mbu-overlay-primary-markdown mbu-overlay-primary-text">
            <ReactMarkdown
              components={{
                a: ({ node: _node, ...linkProps }) => (
                  <a {...linkProps} rel="noreferrer" target="_blank" />
                ),
              }}
              remarkPlugins={[remarkGfm]}
            >
              {props.primary}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="mbu-overlay-primary-text">{props.primary}</pre>
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
          className="mbu-overlay-action mbu-overlay-settings-link"
          onClick={openSettings}
          title="設定を開く"
          type="button"
        >
          <Icon name="settings" size={16} />
          設定を開く
        </Button>
      ) : null}
      {props.secondaryText ? (
        <pre className="mbu-overlay-secondary-text">{props.secondaryText}</pre>
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
    <div className="mbu-overlay-body">
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

export function OverlayHeaderActions(
  props: OverlayHeaderActionsProps
): React.JSX.Element {
  return (
    <div className="mbu-overlay-actions">
      <OverlayPopover
        description="右上に固定します。もう一度クリックで解除。"
        id={props.pinPopoverId}
        title="ピン留め"
      >
        <Button
          aria-describedby={props.pinPopoverId}
          aria-label={props.pinned ? "右上固定を解除" : "右上に固定"}
          className="mbu-overlay-action mbu-overlay-icon-button"
          data-active={props.pinned ? "true" : undefined}
          data-testid="overlay-pin"
          onClick={props.onTogglePinned}
          title={props.pinned ? "右上固定を解除" : "右上に固定"}
          type="button"
        >
          <PinIcon />
        </Button>
      </OverlayPopover>
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
        <OverlayPopover
          description="Markdown表示とシンプル表示を切り替えます。"
          id={props.markdownPopoverId}
          title="表示切り替え"
        >
          <Button
            aria-describedby={props.markdownPopoverId}
            aria-label={
              props.markdownView
                ? "シンプル表示に切り替え"
                : "Markdown表示に切り替え"
            }
            className="mbu-overlay-action mbu-overlay-icon-button"
            data-active={props.markdownView ? "true" : undefined}
            data-testid="overlay-markdown"
            onClick={props.onToggleMarkdownView}
            title={
              props.markdownView
                ? "シンプル表示に切り替え"
                : "Markdown表示に切り替え"
            }
            type="button"
          >
            <Icon
              aria-hidden="true"
              name={props.markdownView ? "eye" : "eye-off"}
            />
          </Button>
        </OverlayPopover>
      ) : null}
      <OverlayPopover
        description="オーバーレイを閉じます。"
        id={props.closePopoverId}
        title="閉じる"
      >
        <Button
          aria-describedby={props.closePopoverId}
          aria-label="閉じる"
          className="mbu-overlay-action mbu-overlay-icon-button"
          data-testid="overlay-close"
          onClick={props.onDismiss}
          title="閉じる"
          type="button"
        >
          ×
        </Button>
      </OverlayPopover>
    </div>
  );
}
