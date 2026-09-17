import { Result } from "@praha/byethrow";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Icon } from "@/components/icon";
import { Accordion } from "@/components/shared/Accordion";
import { Button } from "@/components/shared/Button";
import { DrawerDialog } from "@/components/shared/Dialog";
import { Fieldset } from "@/components/shared/Fieldset";
import { ButtonRow, RowBetween, Stack } from "@/components/shared/Layout";
import { Textarea } from "@/components/shared/Textarea";
import { Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { BlocklistEntry, BlocklistState } from "@/search-blocklist/types";
import {
  computeButtonPosition,
  findEntryForNode,
  isDomNode,
  splitPatternLines,
  suggestPatternFromUrl,
} from "./dom";

const TRIGGER_CLASS_NAME = "mbu-overlay-action mbu-overlay-icon-button";

function openSearchBlocklistSettings(): void {
  chrome.runtime
    .sendMessage({ action: "openPopupPane", paneId: "pane-search-blocklist" })
    .catch(() => {
      // no-op
    });
}

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
  const [hoveredEntry, setHoveredEntry] = useState<BlocklistEntry | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rulesToAddText, setRulesToAddText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const frozenRef = useRef<boolean>(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    frozenRef.current = dialogOpen;
  }, [dialogOpen]);

  useEffect(() => {
    function handlePointerOver(event: PointerEvent): void {
      if (frozenRef.current === true) {
        return;
      }
      if (event.composedPath().includes(props.host)) {
        return;
      }
      const { target } = event;
      const node = isDomNode(target) ? target : null;
      const entry = findEntryForNode(node, props.state.getSnapshot().entries);
      if (!entry) {
        setHoveredEntry(null);
        setPosition(null);
        return;
      }
      setHoveredEntry(entry);
      setPosition(
        computeButtonPosition(entry.container.getBoundingClientRect())
      );
    }

    document.addEventListener("pointerover", handlePointerOver, {
      passive: true,
    });
    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
    };
  }, [props.host, props.state]);

  useEffect(() => {
    if (frozenRef.current === true || !hoveredEntry) {
      return;
    }
    const trackedContainer = hoveredEntry.container;
    function handleReposition(): void {
      if (!trackedContainer.isConnected) {
        setHoveredEntry(null);
        setPosition(null);
        return;
      }
      setPosition(
        computeButtonPosition(trackedContainer.getBoundingClientRect())
      );
    }
    window.addEventListener("scroll", handleReposition, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", handleReposition, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleReposition, {
        capture: true,
      });
      window.removeEventListener("resize", handleReposition);
    };
  }, [hoveredEntry, dialogOpen]);

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
        setHoveredEntry(null);
        setPosition(null);
      }
    },
    [currentEntry]
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

  if (!(currentEntry && position)) {
    return null;
  }

  const hostname = suggestPatternFromUrl(currentEntry.url);
  const rulesToRemoveText = currentEntry.blocked
    ? (currentEntry.matchedPatterns ?? []).join("\n")
    : t("searchBlocklist.dialog.rulesToRemoveEmpty");

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
        onOpenChange={handleOpenChange}
        open={dialogOpen}
        popupAriaLabel={
          currentEntry.blocked
            ? t("searchBlocklist.dialog.titleUnblock")
            : t("searchBlocklist.dialog.titleBlock")
        }
        popupClassName="card card-stack"
        portalContainer={anchorRef}
        trigger={<Icon aria-hidden="true" name="circle-slash" size={16} />}
        triggerAriaLabel={t("searchBlocklist.dialog.triggerAria")}
        triggerClassName={TRIGGER_CLASS_NAME}
      >
        <Stack spacing="small">
          <PaneTitle>
            {currentEntry.blocked
              ? t("searchBlocklist.dialog.titleUnblock")
              : t("searchBlocklist.dialog.titleBlock")}
          </PaneTitle>
          <Hint>
            {hostname || t("searchBlocklist.dialog.hostnameFallback")}
          </Hint>

          <Accordion
            defaultOpen={false}
            itemValue="search-blocklist-details"
            title={t("searchBlocklist.dialog.detailsTitle")}
          >
            <Stack spacing="small">
              <RowBetween>
                <span>{t("searchBlocklist.dialog.detailsUrl")}</span>
                <span>{currentEntry.url}</span>
              </RowBetween>
              <RowBetween>
                <span>{t("searchBlocklist.dialog.detailsTitleField")}</span>
                <span>{currentEntry.title}</span>
              </RowBetween>
              <RowBetween>
                <span>{t("searchBlocklist.dialog.detailsEngine")}</span>
                <span>{snapshot.engineId}</span>
              </RowBetween>
            </Stack>
          </Accordion>

          {!currentEntry.blocked && (
            <Fieldset legend={t("searchBlocklist.dialog.rulesToAdd")}>
              <Textarea
                onChange={handleRulesToAddChange}
                placeholder={t("searchBlocklist.dialog.rulesToAddPlaceholder")}
                rows={3}
                value={rulesToAddText}
              />
            </Fieldset>
          )}

          <Fieldset legend={t("searchBlocklist.dialog.rulesToRemove")}>
            <Textarea readOnly rows={2} value={rulesToRemoveText} />
          </Fieldset>

          {errorMessage && <Hint as="div">{errorMessage}</Hint>}

          <ButtonRow>
            <Button
              aria-label={t("searchBlocklist.dialog.openSettingsAria")}
              onClick={openSearchBlocklistSettings}
              size="small"
              type="button"
              variant="ghost"
            >
              <Icon aria-hidden="true" name="settings" size={16} />
            </Button>
            <Button
              onClick={handleCancel}
              size="small"
              type="button"
              variant="ghost"
            >
              {t("searchBlocklist.dialog.cancelAction")}
            </Button>
            <Button
              onClick={handleSubmit}
              size="small"
              type="button"
              variant={currentEntry.blocked ? "primary" : "danger"}
            >
              {currentEntry.blocked
                ? t("searchBlocklist.dialog.unblockAction")
                : t("searchBlocklist.dialog.blockAction")}
            </Button>
          </ButtonRow>
        </Stack>
      </DrawerDialog>
    </div>
  );
}
