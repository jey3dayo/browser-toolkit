import { useCallback, useState } from "react";
import { Button } from "@/components/shared/Button";
import { PaneCard } from "@/components/shared/Layout";
import { PatternAddForm } from "@/components/shared/PatternAddForm";
import {
  PatternList,
  PatternListItem,
} from "@/components/shared/PatternListItem";
import { ScrollArea } from "@/components/shared/ScrollArea";
import {
  EmptyMessage,
  Hint,
  PaneSubtitle,
} from "@/components/shared/Typography";
import { t } from "@/i18n";
import { FocusDiagnosticPanel } from "@/popup/panes/table/FocusDiagnosticPanel";
import { PatternConfigListItem } from "@/popup/panes/table/PatternConfigListItem";
import {
  TablePaneHeader,
  TablePaneHeading,
  TablePaneSection,
  TablePaneSectionHeading,
  TablePaneStatus,
} from "@/popup/panes/table/TablePaneLayout";
import { useDomainPatterns } from "@/popup/panes/table/useDomainPatterns";
import { useFocusDiagnostic } from "@/popup/panes/table/useFocusDiagnostic";
import { useFocusPatterns } from "@/popup/panes/table/useFocusPatterns";
import type { PopupPaneBaseProps } from "@/popup/panes/types";

export type TablePaneProps = PopupPaneBaseProps;

type FocusPatternRowActionProps = {
  pattern: string;
  onRemove: (pattern: string) => Promise<void>;
};

function FocusPatternRowAction({
  pattern,
  onRemove,
}: FocusPatternRowActionProps): React.JSX.Element {
  const handleRemove = useCallback(() => {
    onRemove(pattern).catch(() => {
      // no-op
    });
  }, [onRemove, pattern]);

  return (
    <Button
      data-focus-pattern-remove={pattern}
      onClick={handleRemove}
      type="button"
      variant="danger"
    >
      {t("common.delete")}
    </Button>
  );
}

export function TablePane(props: TablePaneProps): React.JSX.Element {
  const rowFilterTooltip = t("tablePane.rowFilter.tooltip");

  const {
    patterns,
    addError,
    patternInput,
    setPatternInput,
    setPatterns,
    enableNow,
    togglePatternRowFilter,
    addPattern,
    removePattern,
  } = useDomainPatterns(props);

  const focusPatternsState = useState<string[]>([]);
  const [focusPatterns] = focusPatternsState;

  const {
    focusDiagnostic,
    focusDiagnosticRunning,
    focusDiagnosticSlow,
    focusDiagnosticBadgeVariant,
    runFocusDiagnostic,
    requestFocusDiagnostic,
    reloadCurrentTab,
    syncFocusPatternsRef,
  } = useFocusDiagnostic(props, focusPatterns);

  const {
    focusPatternAddError,
    focusPatternInput,
    setFocusPatternInput,
    addFocusPattern,
    removeFocusPattern,
  } = useFocusPatterns(props, {
    focusPatternsState,
    requestFocusDiagnostic,
    runFocusDiagnostic,
    setPatterns,
    syncFocusPatternsRef,
  });

  const statusLabel = [
    t("tablePane.status.urlPatterns", { count: patterns.length }),
    t("tablePane.status.focus", { count: focusPatterns.length }),
    focusDiagnostic?.label ?? t("tablePane.diagnostic.pending"),
  ].join(" · ");

  const handleEnableNow = useCallback(() => {
    enableNow().catch(() => {
      // no-op
    });
  }, [enableNow]);

  const handlePatternSubmitError = useCallback(() => {
    props.notify.error(t("common.unknownError"));
  }, [props.notify]);

  const handleRefreshFocusDiagnostic = useCallback(() => {
    runFocusDiagnostic(true).catch(() => {
      // no-op
    });
  }, [runFocusDiagnostic]);

  const handleReloadCurrentTab = useCallback(() => {
    reloadCurrentTab().catch(() => {
      // no-op
    });
  }, [reloadCurrentTab]);

  return (
    <PaneCard className="table-pane">
      <TablePaneHeader>
        <TablePaneHeading>
          <Button
            data-testid="enable-table-sort"
            onClick={handleEnableNow}
            type="button"
            variant="primary"
          >
            {t("tablePane.enableCurrentTab")}
          </Button>
        </TablePaneHeading>

        <TablePaneStatus>{statusLabel}</TablePaneStatus>
      </TablePaneHeader>

      <TablePaneSection data-section="url-patterns">
        <TablePaneSectionHeading>
          <PaneSubtitle>{t("tablePane.urlPatterns.title")}</PaneSubtitle>
          <Hint as="div">{t("tablePane.urlPatterns.description")}</Hint>
        </TablePaneSectionHeading>
        <PatternAddForm
          buttonTestId="pattern-add"
          errorMessage={addError ?? undefined}
          errorTestId="pattern-error"
          inputTestId="pattern-input"
          onSubmit={addPattern}
          onSubmitError={handlePatternSubmitError}
          onValueChange={setPatternInput}
          placeholder="example.com/path*"
          value={patternInput}
        />

        {patterns.length > 0 ? (
          <ScrollArea>
            <PatternList aria-label={t("tablePane.urlPatterns.listAria")}>
              {patterns.map((config) => (
                <PatternConfigListItem
                  config={config}
                  key={config.pattern}
                  onRemove={removePattern}
                  onToggleRowFilter={togglePatternRowFilter}
                  rowFilterTooltip={rowFilterTooltip}
                />
              ))}
            </PatternList>
          </ScrollArea>
        ) : (
          <EmptyMessage>{t("tablePane.empty.patterns")}</EmptyMessage>
        )}
      </TablePaneSection>

      <TablePaneSection data-section="focus-override">
        <TablePaneSectionHeading>
          <PaneSubtitle>{t("tablePane.focus.title")}</PaneSubtitle>
          <Hint as="div">{t("tablePane.focus.description")}</Hint>
        </TablePaneSectionHeading>

        <FocusDiagnosticPanel
          focusDiagnostic={focusDiagnostic}
          focusDiagnosticBadgeVariant={focusDiagnosticBadgeVariant}
          focusDiagnosticRunning={focusDiagnosticRunning}
          focusDiagnosticSlow={focusDiagnosticSlow}
          onRefresh={handleRefreshFocusDiagnostic}
          onReloadCurrentTab={handleReloadCurrentTab}
        />

        <Hint as="div">{t("tablePane.focus.reloadHint")}</Hint>
        <PatternAddForm
          buttonTestId="focus-pattern-add"
          errorMessage={focusPatternAddError ?? undefined}
          errorTestId="focus-pattern-error"
          inputTestId="focus-pattern-input"
          onSubmit={addFocusPattern}
          onSubmitError={handlePatternSubmitError}
          onValueChange={setFocusPatternInput}
          placeholder="example.com/title/*"
          value={focusPatternInput}
        />

        {focusPatterns.length > 0 ? (
          <ScrollArea>
            <PatternList aria-label={t("tablePane.focus.listAria")}>
              {focusPatterns.map((pattern) => (
                <PatternListItem
                  action={
                    <FocusPatternRowAction
                      onRemove={removeFocusPattern}
                      pattern={pattern}
                    />
                  }
                  key={pattern}
                  pattern={pattern}
                />
              ))}
            </PatternList>
          </ScrollArea>
        ) : (
          <EmptyMessage>{t("tablePane.empty.patterns")}</EmptyMessage>
        )}
      </TablePaneSection>
    </PaneCard>
  );
}
