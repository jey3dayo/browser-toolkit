import type { Theme } from "@/ui/theme";
import { OverlayHeaderActions } from "../OverlayComponents";
import { overlayClassNames } from "../overlayClassNames";

type Props = {
  title: string;
  sourceLabel: string;
  dragging: boolean;
  onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  closePopoverId: string;
  markdownPopoverId: string;
  markdownView: boolean;
  onDismiss: () => void;
  onToggleMarkdownView: () => void;
  onTogglePinned: () => void;
  onToggleTheme: () => void;
  pinned: boolean;
  pinPopoverId: string;
  showMarkdownToggle: boolean;
  theme: Theme;
  themePopoverId: string;
};

/** Overlay panel header: title chip, drag handle, and header action buttons. */
export function OverlayHeader(props: Props): React.JSX.Element {
  return (
    <div
      className={overlayClassNames.header}
      data-dragging={props.dragging ? "true" : undefined}
      onPointerCancel={props.onPointerCancel}
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
    >
      <div className={overlayClassNames.headerLeft}>
        <div className={overlayClassNames.title}>
          {props.title}{" "}
          <span className={overlayClassNames.chip}>{props.sourceLabel}</span>
        </div>
      </div>
      <OverlayHeaderActions
        closePopoverId={props.closePopoverId}
        markdownPopoverId={props.markdownPopoverId}
        markdownView={props.markdownView}
        onDismiss={props.onDismiss}
        onToggleMarkdownView={props.onToggleMarkdownView}
        onTogglePinned={props.onTogglePinned}
        onToggleTheme={props.onToggleTheme}
        pinned={props.pinned}
        pinPopoverId={props.pinPopoverId}
        showMarkdownToggle={props.showMarkdownToggle}
        theme={props.theme}
        themePopoverId={props.themePopoverId}
      />
    </div>
  );
}
