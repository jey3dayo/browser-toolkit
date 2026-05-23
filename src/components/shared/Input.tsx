import { Input as BaseInput } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

const inputVariants = cva("", {
  variants: {
    variant: {
      pattern: "pattern-input",
      token: "token-input",
    },
    withIcon: {
      false: null,
      true: "token-input--with-icon",
    },
  },
});

export type InputProps = Omit<
  React.ComponentProps<typeof BaseInput>,
  "className"
> &
  VariantProps<typeof inputVariants> & {
    className?: string;
  };

export function Input({
  className,
  variant,
  withIcon,
  ...props
}: InputProps): React.JSX.Element {
  return (
    <BaseInput
      className={inputVariants({ className, variant, withIcon })}
      {...props}
    />
  );
}

type InputWithIconProps = ComponentPropsWithoutRef<"div">;

export function InputWithIcon({
  className,
  ...props
}: InputWithIconProps): React.JSX.Element {
  return <div className={cva("input-with-icon")({ className })} {...props} />;
}
