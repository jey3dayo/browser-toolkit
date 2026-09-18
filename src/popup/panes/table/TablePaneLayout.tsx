import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { RowBetween, Stack } from "@/components/shared/Layout";

export function TablePaneHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div
      className={cva("table-pane-header stack-sm")({ className })}
      {...props}
    />
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

export function TablePaneStatus({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p
      className={cva("table-pane-status")({ className })}
      data-testid="table-pane-status"
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
