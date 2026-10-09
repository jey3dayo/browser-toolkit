import { Result } from "@praha/byethrow";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icon";
import { DrawerDialog } from "@/components/shared/Dialog";
import { t } from "@/i18n";
import type { BlocklistState } from "@/search-blocklist/types";
import { BlocklistDialogContent } from "./BlocklistDialogContent";
import { splitPatternLines, suggestPatternFromUrl } from "./dom";
import { useDialogPosition } from "./useDialogPosition";
import { useHoveredEntry } from "./useHoveredEntry";

const TRIGGER_CLASS_NAME = "mbu-overlay-action mbu-overlay-icon-button";

function addRulesSequentially(
  state: BlocklistState,
  patterns: string[]
): Promise<Result.Result<void, string>> {
  return patterns.reduce<Promise<Result.Result<void, string>>>(
    (previous, pattern) =>
      previous.then((prevResult) =>
        Result.isFailure(prevResult) ? prevResult : state.addRule(pattern)
      ),
    Promise.resolve(Result.succeed(undefined))
  );
}

export type FloatingWidgetProps = {
  host: HTMLElement;
  state: BlocklistState;
};

export function FloatingWidget(
  props: FloatingWidgetProps
): React.JSX.Element | null {
  const snapshot = useSyncExternalStore(
    props.state.subscribe,
    props.state.getSnapshot
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rulesToAddText, setRulesToAddText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [popupEl, setPopupEl] = useState<HTMLDivElement | null>(null);
  const addTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const primaryButtonRef = useRef<HTMLElement | null>(null);

  const { hoveredEntry, position, clearHover } = useHoveredEntry({
    frozen: dialogOpen,
    host: props.host,
    state: props.state,
  });
  useDialogPosition({ dialogOpen, popupEl, triggerRef });

  const currentEntry = hoveredEntry
    ? (snapshot.entries.find(
        (entry) => entry.container === hoveredEntry.container
      ) ?? hoveredEntry)
    : null;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      setErrorMessage(null);
      if (open && currentEntry) {
        setRulesToAddText(
          currentEntry.blocked ? "" : suggestPatternFromUrl(currentEntry.url)
        );
      }
      if (!open) {
        clearHover();
      }
    },
    [clearHover, currentEntry]
  );

  const handleSubmit = useCallback(() => {
    if (!currentEntry) {
      return;
    }
    (async () => {
      if (currentEntry.blocked) {
        const result = await props.state.removeRules(
          currentEntry.matchedRuleIds
        );
        if (Result.isFailure(result)) {
          setErrorMessage(result.error);
          return;
        }
      } else {
        const patterns = splitPatternLines(rulesToAddText);
        const result = await addRulesSequentially(props.state, patterns);
        if (Result.isFailure(result)) {
          setErrorMessage(result.error);
          return;
        }
      }
      handleOpenChange(false);
    })().catch(() => {
      setErrorMessage(t("searchBlocklist.errors.saveFailed"));
    });
  }, [currentEntry, handleOpenChange, props.state, rulesToAddText]);

  const handleCancel = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const handleRulesToAddChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRulesToAddText(event.target.value);
    },
    []
  );

  const focusInitialDialogElement = useCallback((): HTMLElement | null => {
    if (currentEntry?.blocked) {
      return primaryButtonRef.current;
    }
    return addTextareaRef.current;
  }, [currentEntry?.blocked]);

  if (!(currentEntry && position)) {
    return null;
  }

  return (
    <div
      ref={anchorRef}
      style={{
        left: position.left,
        position: "fixed",
        top: position.top,
        zIndex: 2_147_483_647,
      }}
    >
      <DrawerDialog
        initialFocus={focusInitialDialogElement}
        modal="trap-focus"
        onOpenChange={handleOpenChange}
        open={dialogOpen}
        popupAriaLabel={
          currentEntry.blocked
            ? t("searchBlocklist.dialog.titleUnblock")
            : t("searchBlocklist.dialog.titleBlock")
        }
        popupClassName="mbu-blocklist-dialog"
        popupRef={setPopupEl}
        portalContainer={anchorRef}
        trigger={<Icon aria-hidden="true" name="circle-slash" size={16} />}
        triggerAriaLabel={t("searchBlocklist.dialog.triggerAria")}
        triggerClassName={TRIGGER_CLASS_NAME}
        triggerRef={triggerRef}
      >
        <BlocklistDialogContent
          addTextareaRef={addTextareaRef}
          engineId={snapshot.engineId}
          entry={currentEntry}
          errorMessage={errorMessage}
          onCancel={handleCancel}
          onRulesToAddChange={handleRulesToAddChange}
          onSubmit={handleSubmit}
          primaryButtonRef={primaryButtonRef}
          rulesToAddText={rulesToAddText}
        />
      </DrawerDialog>
    </div>
  );
}
