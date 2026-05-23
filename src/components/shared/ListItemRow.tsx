import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ListItemRowProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "title"
> & {
  actions?: ReactNode;
  actionsClassName?: string;
  children?: ReactNode;
  contentClassName?: string;
  leading?: ReactNode;
  meta?: ReactNode;
  title?: ReactNode;
};

type ListItemRowTextProps = {
  meta?: ReactNode;
  title?: ReactNode;
};

export function ListItemRowText({
  meta,
  title,
}: ListItemRowTextProps): React.JSX.Element {
  return (
    <>
      {title !== undefined && (
        <strong className="search-engine-name">{title}</strong>
      )}
      {meta !== undefined && <code className="search-engine-url">{meta}</code>}
    </>
  );
}

export function ListItemRow({
  actions,
  actionsClassName,
  children,
  className,
  contentClassName,
  leading,
  meta,
  title,
  ...props
}: ListItemRowProps): React.JSX.Element {
  return (
    <div className={cva("search-engine-item")({ className })} {...props}>
      {leading}
      <div
        className={cva("search-engine-content")({
          className: contentClassName,
        })}
      >
        {children ?? <ListItemRowText meta={meta} title={title} />}
      </div>
      {actions !== undefined && (
        <div
          className={cva("search-engine-controls")({
            className: actionsClassName,
          })}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
