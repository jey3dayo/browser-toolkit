import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

type DivProps = ComponentPropsWithoutRef<"div">;
type HeaderProps = ComponentPropsWithoutRef<"header">;
type MainProps = ComponentPropsWithoutRef<"main">;

export function PopupShell({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return (
    <div className={cva("app-shell mbu-surface")({ className })} {...props} />
  );
}

export function PopupContent({
  className,
  ...props
}: MainProps): React.JSX.Element {
  return <main className={cva("content")({ className })} {...props} />;
}

export function PopupContentHeader({
  className,
  ...props
}: HeaderProps): React.JSX.Element {
  return <header className={cva("content-header")({ className })} {...props} />;
}

export function PopupTitleBlock({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return <div className={cva("title-block")({ className })} {...props} />;
}

export function PopupContentBody({
  className,
  ...props
}: DivProps): React.JSX.Element {
  return <div className={cva("content-body")({ className })} {...props} />;
}
