import { type CSSProperties, useEffect, useState } from "react";
import { formatElapsed } from "@/content/overlay/overlayUtils";
import { overlayClassNames } from "./overlayClassNames";

const LOADER_GRID_SIZE = 3;
const LOADER_DELAY_STEP_MS = 90;
const ELAPSED_TICK_MS = 100;

type LoaderCellStyle = CSSProperties & { "--mbu-loader-delay": string };

type LoaderCell = { key: string; style: LoaderCellStyle };

const LOADER_CELLS: LoaderCell[] = Array.from(
  { length: LOADER_GRID_SIZE * LOADER_GRID_SIZE },
  (_, index) => {
    const row = Math.floor(index / LOADER_GRID_SIZE);
    const column = index % LOADER_GRID_SIZE;
    const delay = (column + Math.abs(row - 1)) * LOADER_DELAY_STEP_MS;
    return {
      key: `cell-${row}-${column}`,
      style: { "--mbu-loader-delay": `${delay}ms` } satisfies LoaderCellStyle,
    };
  }
);

/**
 * 3x3 pixel-grid loading indicator
 */
function OverlayLoaderGrid(): React.JSX.Element {
  return (
    <span aria-hidden="true" className={overlayClassNames.loaderGrid}>
      {LOADER_CELLS.map((cell) => (
        <span
          className={overlayClassNames.loaderCell}
          key={cell.key}
          style={cell.style}
        />
      ))}
    </span>
  );
}

type OverlayElapsedProps = {
  startedAt?: number;
};

/**
 * Elapsed time indicator, isolated so its 100ms ticks don't re-render the parent overlay
 */
function OverlayElapsed(props: OverlayElapsedProps): React.JSX.Element {
  const [startedAt] = useState(() => props.startedAt ?? performance.now());
  const [elapsedMs, setElapsedMs] = useState(
    () => performance.now() - startedAt
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, ELAPSED_TICK_MS);
    return () => clearInterval(intervalId);
  }, [startedAt]);

  return (
    <span aria-hidden="true" className={overlayClassNames.statusElapsed}>
      {formatElapsed(elapsedMs)}
    </span>
  );
}

type OverlayProgressStatusProps = {
  label: string;
  startedAt?: number;
};

/**
 * Loader grid, shimmering label and elapsed time, shared by the primary status row and chat "thinking" row
 */
export function OverlayProgressStatus(
  props: OverlayProgressStatusProps
): React.JSX.Element {
  return (
    <>
      <OverlayLoaderGrid />
      <span className={overlayClassNames.statusShimmer}>{props.label}</span>
      <OverlayElapsed startedAt={props.startedAt} />
    </>
  );
}
