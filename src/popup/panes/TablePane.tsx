import { useState } from "react";
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
  PaneTitle,
} from "@/components/shared/Typography";
import { t } from "@/i18n";
import { FocusDiagnosticPanel } from "@/popup/panes/table/FocusDiagnosticPanel";
import { PatternConfigListItem } from "@/popup/panes/table/PatternConfigListItem";
import {
  TablePaneHeader,
  TablePaneHeading,
  TablePaneSection,
  TablePaneSectionHeading,
  TablePaneSummaryCard,
} from "@/popup/panes/table/TablePaneLayout";
import { useDomainPatterns } from "@/popup/panes/table/useDomainPatterns";
import { useFocusDiagnostic } from "@/popup/panes/table/useFocusDiagnostic";
import { useFocusPatterns } from "@/popup/panes/table/useFocusPatterns";
import type { PopupPaneBaseProps } from "@/popup/panes/types";

export type TablePaneProps = PopupPaneBaseProps;

export function TablePane(props: TablePaneProps): React.JSX.Element {
  const rowFilterTooltip = t("tablePane.rowFilter.tooltip");

  const {
    patterns,
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
    focusPatternInput,
    setFocusPatternInput,
    addFocusPattern,
    removeFocusPattern,
  } = useFocusPatterns(props, {
    focusPatternsState,
    setPatterns,
    runFocusDiagnostic,
    requestFocusDiagnostic,
    syncFocusPatternsRef,
  });

  const summaryFocusStatusLabel =
    focusDiagnostic?.label ?? t("tablePane.summary.pending");
  const summaryFocusDescription = focusDiagnostic
    ? focusDiagnostic.description
    : t("tablePane.summary.focusDescription");
  const urlPatternSummaryLabel =
    patterns.length === 0
      ? t("tablePane.summary.notRegistered")
      : t("tablePane.summary.registeredCount", { count: patterns.length });
  const focusPatternSummaryLabel =
    focusPatterns.length === 0
      ? t("tablePane.summary.notRegistered")
      : t("tablePane.summary.registeredCount", {
          count: focusPatterns.length,
        });

  return (
    <PaneCard className="table-pane">
      <TablePaneHeader>
        <TablePaneHeading>
          <PaneTitle>{t("tablePane.title")}</PaneTitle>
          <Button
            data-testid="enable-table-sort"
            onClick={() => {
              enableNow().catch(() => {
                // no-op
              });
            }}
            type="button"
            variant="primary"
          >
            {t("tablePane.enableCurrentTab")}
          </Button>
        </TablePaneHeading>

        <TablePaneSummaryCard
          focusDiagnosticBadgeVariant={focusDiagnosticBadgeVariant}
          focusPatternSummaryLabel={focusPatternSummaryLabel}
          summaryFocusDescription={summaryFocusDescription}
          summaryFocusStatusLabel={summaryFocusStatusLabel}
          urlPatternSummaryLabel={urlPatternSummaryLabel}
        />
      </TablePaneHeader>

      <TablePaneSection data-section="url-patterns">
        <TablePaneSectionHeading>
          <PaneSubtitle>{t("tablePane.urlPatterns.title")}</PaneSubtitle>
          <Hint as="div">{t("tablePane.urlPatterns.description")}</Hint>
        </TablePaneSectionHeading>
        <PatternAddForm
          buttonTestId="pattern-add"
          inputTestId="pattern-input"
          onSubmit={addPattern}
          onSubmitError={() => {
            props.notify.error(t("common.unknownError"));
          }}
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
          onRefresh={() => {
            runFocusDiagnostic(true).catch(() => {
              // no-op
            });
          }}
          onReloadCurrentTab={() => {
            reloadCurrentTab().catch(() => {
              // no-op
            });
          }}
        />

        <Hint as="div">{t("tablePane.focus.reloadHint")}</Hint>
        <PatternAddForm
          buttonTestId="focus-pattern-add"
          inputTestId="focus-pattern-input"
          onSubmit={addFocusPattern}
          onSubmitError={() => {
            props.notify.error(t("common.unknownError"));
          }}
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
                    <Button
                      data-focus-pattern-remove={pattern}
                      onClick={() => {
                        removeFocusPattern(pattern).catch(() => {
                          // no-op
                        });
                      }}
                      type="button"
                      variant="danger"
                    >
                      {t("common.delete")}
                    </Button>
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
