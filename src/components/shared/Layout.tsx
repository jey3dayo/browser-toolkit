import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

const stackVariants = cva("", {
  variants: {
    spacing: {
      default: "stack",
      small: "stack-sm",
    },
  },
  defaultVariants: {
    spacing: "default",
  },
});

type DivProps = ComponentPropsWithoutRef<"div">;
type SectionProps = ComponentPropsWithoutRef<"section">;

type StackProps = DivProps & VariantProps<typeof stackVariants>;

export function Stack({
  className,
  spacing,
  ...props
}: StackProps): React.JSX.Element {
  return <div className={stackVariants({ className, spacing })} {...props} />;
}

export function RowBetween({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return <div className={cva("row-between")({ className })} {...props} />;
}

export function ButtonRow({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return <div className={cva("button-row")({ className })} {...props} />;
}

export function ActionButtonsRow({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return <div className={cva("action-buttons")({ className })} {...props} />;
}

export function ActionRow({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return <div className={cva("action-row")({ className })} {...props} />;
}

export function ActionListItem({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return <div className={cva("action-item")({ className })} {...props} />;
}

export function PatternInputRow({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return <div className={cva("pattern-input-row")({ className })} {...props} />;
}

export function PaneCard({ className, ...props }: DivProps): React.JSX.Element {
  return <div className={cva("card card-stack")({ className })} {...props} />;
}

export function OutputPanel({
  className,
  ...props
}: SectionProps): React.JSX.Element {
  return <section className={cva("output-panel")({ className })} {...props} />;
}

export function EditorPanel({
  className,
  ...props
}: SectionProps): React.JSX.Element {
  return <section className={cva("editor-panel")({ className })} {...props} />;
}
