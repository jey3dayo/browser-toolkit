import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ExtractedEvent, SummarySource } from "@/shared_types";
import { applyTheme, type Theme } from "@/ui/theme";
import { nextTheme } from "@/ui/themeCycle";
import {
  loadStoredTheme,
  normalizeTheme,
  persistTheme,
  themeFromHost,
} from "@/ui/themeStorage";
import { createNotifications, ToastHost } from "@/ui/toast";
import { OverlayBody, OverlayHeaderActions } from "./OverlayComponents";
import {
  copyTextToClipboard,
  downloadIcsFile,
  openUrlInNewTab,
} from "./overlayActions";
import {
  type DragOffset,
  endOverlayDrag,
  getPanelSize,
  moveOverlayDrag,
  type PanelSize,
  type Point,
  positionOverlayHost,
  startOverlayDrag,
  toggleOverlayPinned,
  updateOverlayToastSurfaceInset,
} from "./overlayPosition";
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
  const [theme, setTheme] = useState<Theme>(() => themeFromHost(props.host));
  const [markdownView, setMarkdownView] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pinPopoverId = useId();
  const themePopoverId = useId();
  const markdownPopoverId = useId();
  const closePopoverId = useId();
  const [panelSize, setPanelSize] = useState<PanelSize>({
    width: 520,
    height: 300,
  });
  const [pinned, setPinned] = useState(false);
  const [pinnedPos, setPinnedPos] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef<DragOffset | null>(null);

  useEffect(() => {
    let disposed = false;
    const fallback = themeFromHost(props.host);

    loadStoredTheme(fallback)
      .then((storedTheme) => {
        if (disposed) {
          return;
        }
        setTheme(storedTheme);
        applyTheme(storedTheme, props.portalContainer);
      })
      .catch(() => {
        // no-op
      });

    if (typeof chrome === "undefined") {
      return () => {
        disposed = true;
      };
    }

    const onChanged = chrome.storage?.onChanged;
    if (!onChanged?.addListener) {
      return () => {
        disposed = true;
      };
    }

    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ): void => {
      if (areaName !== "local") {
        return;
      }
      if (!("theme" in changes)) {
        return;
      }
      const change = changes.theme as chrome.storage.StorageChange | undefined;
      const nextValue = normalizeTheme(change?.newValue);
      setTheme(nextValue);
      applyTheme(nextValue, props.portalContainer);
    };

    onChanged.addListener(handleChange);

    return () => {
      disposed = true;
      onChanged.removeListener?.(handleChange);
    };
  }, [props.host, props.portalContainer]);

  useLayoutEffect(() => {
    if (!viewModel.open) {
      return;
    }

    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") {
      return;
    }

    let lastWidth = 0;
    let lastHeight = 0;

    const commit = (size: PanelSize): void => {
      const width = Math.round(size.width);
      const height = Math.round(size.height);
      if (width <= 0 || height <= 0) {
        return;
      }
      if (width === lastWidth && height === lastHeight) {
        return;
      }
      lastWidth = width;
      lastHeight = height;
      setPanelSize({ width, height });
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      commit({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(panel);
    commit(getPanelSize(panel));

    return () => {
      observer.disconnect();
    };
  }, [viewModel.open]);

  useLayoutEffect(() => {
    const updatePosition = (): void => {
      positionOverlayHost({
        open: viewModel.open,
        host: props.host,
        size: panelSize,
        pinned,
        pinnedPos,
        anchorRect: viewModel.anchorRect,
      });
      updateOverlayToastSurfaceInset({
        host: props.host,
        panel: panelRef.current,
      });
    };

    updatePosition();

    if (!viewModel.open) {
      return;
    }

    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [
    props.host,
    viewModel.open,
    viewModel.anchorRect,
    pinned,
    pinnedPos,
    panelSize,
  ]);

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

  const startDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    startOverlayDrag({
      event,
      host: props.host,
      dragOffsetRef,
      setDragging,
      setPinnedPos,
    });
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    moveOverlayDrag({
      event,
      pinned,
      panel: panelRef.current,
      dragging,
      dragOffsetRef,
      setPinned,
      setPinnedPos,
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    endOverlayDrag({ event, dragging, dragOffsetRef, setDragging });
  };

  const togglePinned = (): void => {
    toggleOverlayPinned({ pinned, setPinned, setPinnedPos });
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

  return (
    <div className="mbu-overlay-surface">
      <ToastHost
        placement="surface"
        portalContainer={props.portalContainer}
        toastManager={toastManager}
      />
      <div className="mbu-overlay-panel" ref={panelRef}>
        <div
          className="mbu-overlay-header"
          data-dragging={dragging ? "true" : undefined}
          onPointerCancel={endDrag}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
        >
          <div className="mbu-overlay-header-left">
            <div className="mbu-overlay-title">
              {viewModel.title}{" "}
              <span className="mbu-overlay-chip">{sourceLabel}</span>
            </div>
          </div>
          <OverlayHeaderActions
            closePopoverId={closePopoverId}
            markdownPopoverId={markdownPopoverId}
            markdownView={markdownView}
            onDismiss={props.onDismiss}
            onToggleMarkdownView={toggleMarkdownView}
            onTogglePinned={togglePinned}
            onToggleTheme={toggleTheme}
            pinned={pinned}
            pinPopoverId={pinPopoverId}
            showMarkdownToggle={showMarkdownToggle}
            theme={theme}
            themePopoverId={themePopoverId}
          />
        </div>

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
      </div>
    </div>
  );
}
