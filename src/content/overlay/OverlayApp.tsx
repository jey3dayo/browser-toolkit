import { useId, useMemo, useRef, useState } from "react";
import type { ExtractedEvent, SummarySource } from "@/shared_types";
import { applyTheme } from "@/ui/theme";
import { nextTheme } from "@/ui/themeCycle";
import { persistTheme } from "@/ui/themeStorage";
import { createNotifications, ToastHost } from "@/ui/toast";
import { OverlayHeader } from "./OverlayApp/OverlayHeader";
import { useOverlayChat } from "./OverlayApp/useOverlayChat";
import { useOverlayPositioning } from "./OverlayApp/useOverlayPositioning";
import { useOverlayTheme } from "./OverlayApp/useOverlayTheme";
import { OverlayBody, OverlayChatInput } from "./OverlayComponents";
import {
  copyTextToClipboard,
  downloadIcsFile,
  openUrlInNewTab,
} from "./overlayActions";
import { overlayClassNames } from "./overlayClassNames";
import {
  canCopyPrimaryFromViewModel,
  canDownloadIcsFromViewModel,
  canOpenCalendarFromViewModel,
  deriveSecondaryText,
  readyEventFromViewModel,
  sourceLabelFromSource,
  statusLabelFromStatus,
} from "./overlayUtils";

export type OverlayViewModel = {
  open: boolean;
  status: "loading" | "ready" | "error";
  mode: "text" | "event";
  source: SummarySource;
  title: string;
  primary: string;
  secondary: string;
  event?: ExtractedEvent;
  calendarUrl?: string;
  ics?: string;
  anchorRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
};

type Props = {
  host: HTMLDivElement;
  portalContainer: ShadowRoot;
  viewModel: OverlayViewModel;
  onDismiss: () => void;
};

export function OverlayApp(props: Props): React.JSX.Element | null {
  const { toastManager, notify } = useMemo(() => createNotifications(), []);
  const viewModel = props.viewModel;
  const [theme, setTheme] = useOverlayTheme(props.host, props.portalContainer);
  const [markdownView, setMarkdownView] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pinPopoverId = useId();
  const themePopoverId = useId();
  const markdownPopoverId = useId();
  const closePopoverId = useId();

  const { pinned, dragging, startDrag, moveDrag, endDrag, togglePinned } =
    useOverlayPositioning({ host: props.host, viewModel, panelRef });

  const { chatMessages, isChatting, handleChatSend } = useOverlayChat(
    viewModel.primary
  );

  if (!viewModel.open) {
    return null;
  }

  const onCopyPrimary = (): void => {
    copyTextToClipboard(notify, viewModel.primary).catch(() => {
      // no-op
    });
  };

  const openCalendar = (): void => {
    openUrlInNewTab(viewModel.calendarUrl ?? "");
  };

  const downloadIcs = (): void => {
    downloadIcsFile(notify, viewModel.ics ?? "");
  };

  const toggleTheme = (): void => {
    const next = nextTheme(theme);
    setTheme(next);
    applyTheme(next, props.portalContainer);
    persistTheme(next).catch(() => {
      // no-op
    });
  };

  const toggleMarkdownView = (): void => {
    setMarkdownView((current) => !current);
  };

  const sourceLabel = sourceLabelFromSource(viewModel.source);
  const statusLabel = statusLabelFromStatus(viewModel.status);
  const { selectionText, secondaryText } = deriveSecondaryText(
    viewModel.secondary
  );
  const readyEvent = readyEventFromViewModel(viewModel);
  const canCopyPrimary = canCopyPrimaryFromViewModel(viewModel);
  const canOpenCalendar = canOpenCalendarFromViewModel(viewModel);
  const canDownloadIcs = canDownloadIcsFromViewModel(viewModel);
  const showMarkdownToggle = viewModel.mode === "text";
  const showChat = viewModel.mode === "text" && viewModel.status === "ready";

  return (
    <div className={overlayClassNames.surface}>
      <ToastHost
        placement="surface"
        portalContainer={props.portalContainer}
        toastManager={toastManager}
      />
      <div className={overlayClassNames.panel} ref={panelRef}>
        <OverlayHeader
          closePopoverId={closePopoverId}
          dragging={dragging}
          markdownPopoverId={markdownPopoverId}
          markdownView={markdownView}
          onDismiss={props.onDismiss}
          onPointerCancel={endDrag}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onToggleMarkdownView={toggleMarkdownView}
          onTogglePinned={togglePinned}
          onToggleTheme={toggleTheme}
          pinned={pinned}
          pinPopoverId={pinPopoverId}
          showMarkdownToggle={showMarkdownToggle}
          sourceLabel={sourceLabel}
          theme={theme}
          themePopoverId={themePopoverId}
          title={viewModel.title}
        />

        <OverlayBody
          canCopyPrimary={canCopyPrimary}
          canDownloadIcs={canDownloadIcs}
          canOpenCalendar={canOpenCalendar}
          markdownView={markdownView}
          mode={viewModel.mode}
          onCopyPrimary={onCopyPrimary}
          onDownloadIcs={downloadIcs}
          onOpenCalendar={openCalendar}
          primary={viewModel.primary}
          readyEvent={readyEvent}
          secondaryText={secondaryText}
          selectionText={selectionText}
          status={viewModel.status}
          statusLabel={statusLabel}
        />

        {showChat ? (
          <OverlayChatInput
            chatMessages={chatMessages}
            isChatting={isChatting}
            onSend={handleChatSend}
          />
        ) : null}
      </div>
    </div>
  );
}
