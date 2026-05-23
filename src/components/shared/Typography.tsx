import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

type HeadingProps = ComponentPropsWithoutRef<"h2">;
type SubheadingProps = ComponentPropsWithoutRef<"h3">;
type DivProps = ComponentPropsWithoutRef<"div">;
type ParagraphProps = ComponentPropsWithoutRef<"p">;
type SpanProps = ComponentPropsWithoutRef<"span">;
type HintProps =
  | (ParagraphProps & {
      as?: "p";
    })
  | (DivProps & {
      as: "div";
    });

export function PaneTitle({
  children,
  className,
  ...props
}: HeadingProps): React.JSX.Element {
  return (
    <h2 className={cva("pane-title")({ className })} {...props}>
      {children}
    </h2>
  );
}

export function PaneSubtitle({
  children,
  className,
  ...props
}: SubheadingProps): React.JSX.Element {
  return (
    <h3 className={cva("pane-subtitle")({ className })} {...props}>
      {children}
    </h3>
  );
}

export function EditorTitle({
  children,
  className,
  ...props
}: SubheadingProps): React.JSX.Element {
  return (
    <h3 className={cva("editor-title")({ className })} {...props}>
      {children}
    </h3>
  );
}

export function MetaTitle({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return <div className={cva("meta-title")({ className })} {...props} />;
}

export function ActionTitle({
  className,
  ...props
}: SpanProps): React.JSX.Element {
  return <span className={cva("action-title")({ className })} {...props} />;
}

export function Hint(props: HintProps): React.JSX.Element {
  const { as = "p", className } = props;
  const hintClassName = cva("hint")({ className });

  if (as === "div") {
    const { as: _as, className: _className, ...divProps } = props;
    return <div className={hintClassName} {...divProps} />;
  }

  const { as: _as, className: _className, ...paragraphProps } = props;
  return <p className={hintClassName} {...paragraphProps} />;
}

export function HintText({
  className,
  ...props
}: SpanProps): React.JSX.Element {
  return <span className={cva("hint")({ className })} {...props} />;
}

export function EmptyMessage({
  className,
  ...props
}: ParagraphProps): React.JSX.Element {
  return <p className={cva("empty-message")({ className })} {...props} />;
}
