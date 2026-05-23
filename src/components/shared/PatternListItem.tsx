import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const patternListVariants = cva("pattern-list-inner");

const patternListItemVariants = cva("pattern-item", {
  variants: {
    withToggle: {
      false: "pattern-item--simple",
      true: "pattern-item--with-toggle",
    },
  },
});

type PatternListItemProps = {
  action: ReactNode;
  pattern: string;
  toggle?: ReactNode;
};

export function PatternList({
  className,
  ...props
}: ComponentPropsWithoutRef<"ul">): React.JSX.Element {
  return <ul className={patternListVariants({ className })} {...props} />;
}

export function PatternListItem({
  action,
  pattern,
  toggle,
}: PatternListItemProps): React.JSX.Element {
  return (
    <li
      className={patternListItemVariants({ withToggle: Boolean(toggle) })}
      key={pattern}
    >
      <code className="pattern-text">{pattern}</code>
      {toggle}
      {action}
    </li>
  );
}
