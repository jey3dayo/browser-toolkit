import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { Badge, type BadgeProps } from "@/components/shared/Badge";
import { RowBetween, Stack } from "@/components/shared/Layout";
import { t } from "@/i18n";
import type { FocusDiagnosticBadgeVariant } from "@/popup/panes/table/FocusDiagnosticPanel";

export function TablePaneHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div className={cva("table-pane-header stack")({ className })} {...props} />
  );
}

export function TablePaneHeading({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RowBetween>): React.JSX.Element {
  return (
    <RowBetween
      className={cva("table-pane-heading")({ className })}
      {...props}
    />
  );
}

export function TablePaneSection({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">): React.JSX.Element {
  return (
    <section
      className={cva("table-pane-section stack")({ className })}
      data-testid="table-pane-section"
      {...props}
    />
  );
}

export function TablePaneSectionHeading({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Stack>): React.JSX.Element {
  return (
    <Stack
      className={cva("table-pane-section-heading")({ className })}
      spacing="small"
      {...props}
    />
  );
}

function TablePaneSummary({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">): React.JSX.Element {
  return (
    <section
      className={cva("table-pane-summary")({ className })}
      data-testid="table-pane-summary"
      {...props}
    />
  );
}

function TablePaneSummaryHeading({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div
      className={cva("table-pane-summary-heading")({ className })}
      {...props}
    />
  );
}

function TablePaneSummaryTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-title")({ className })} {...props} />
  );
}

function TablePaneSummaryCopy({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-copy")({ className })} {...props} />
  );
}

function TablePaneSummaryStatus({
  className,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <Badge
      className={cva("table-pane-summary-status")({ className })}
      {...props}
    />
  );
}

function TablePaneSummaryGrid({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div className={cva("table-pane-summary-grid")({ className })} {...props} />
  );
}

function TablePaneSummaryItem({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div className={cva("table-pane-summary-item")({ className })} {...props} />
  );
}

function TablePaneSummaryLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-label")({ className })} {...props} />
  );
}

function TablePaneSummaryValue({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-value")({ className })} {...props} />
  );
}

function TablePaneSummaryMeta({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-meta")({ className })} {...props} />
  );
}

export type TablePaneSummaryCardProps = {
  focusDiagnosticBadgeVariant: FocusDiagnosticBadgeVariant;
  focusPatternSummaryLabel: string;
  summaryFocusDescription: string;
  summaryFocusStatusLabel: string;
  urlPatternSummaryLabel: string;
};

export function TablePaneSummaryCard({
  focusDiagnosticBadgeVariant,
  focusPatternSummaryLabel,
  summaryFocusDescription,
  summaryFocusStatusLabel,
  urlPatternSummaryLabel,
}: TablePaneSummaryCardProps): React.JSX.Element {
  return (
    <TablePaneSummary>
      <TablePaneSummaryHeading>
        <Stack spacing="small">
          <TablePaneSummaryTitle>
            {t("tablePane.summary.title")}
          </TablePaneSummaryTitle>
          <TablePaneSummaryCopy>
            {t("tablePane.summary.description")}
          </TablePaneSummaryCopy>
        </Stack>
        <TablePaneSummaryStatus variant={focusDiagnosticBadgeVariant}>
          {summaryFocusStatusLabel}
        </TablePaneSummaryStatus>
      </TablePaneSummaryHeading>

      <TablePaneSummaryGrid>
        <TablePaneSummaryItem>
          <TablePaneSummaryLabel>
            {t("tablePane.summary.urlPatterns")}
          </TablePaneSummaryLabel>
          <TablePaneSummaryValue>
            {urlPatternSummaryLabel}
          </TablePaneSummaryValue>
          <TablePaneSummaryMeta>
            {t("tablePane.summary.urlPatternsMeta")}
          </TablePaneSummaryMeta>
        </TablePaneSummaryItem>

        <TablePaneSummaryItem>
          <TablePaneSummaryLabel>
            {t("tablePane.summary.focus")}
          </TablePaneSummaryLabel>
          <TablePaneSummaryValue>
            {focusPatternSummaryLabel}
          </TablePaneSummaryValue>
          <TablePaneSummaryMeta>{summaryFocusDescription}</TablePaneSummaryMeta>
        </TablePaneSummaryItem>
      </TablePaneSummaryGrid>
    </TablePaneSummary>
  );
}
