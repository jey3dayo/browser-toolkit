import { cva, type VariantProps } from "class-variance-authority";

const checkboxLabelVariants = cva("", {
  variants: {
    variant: {
      inline: "checkbox-inline",
    },
  },
  defaultVariants: {
    variant: "inline",
  },
});

export type CheckboxInlineProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> &
  VariantProps<typeof checkboxLabelVariants> & {
    children: React.ReactNode;
    className?: string;
  };

export function CheckboxInline({
  children,
  className,
  variant,
  ...props
}: CheckboxInlineProps): React.JSX.Element {
  return (
    <label
      className={checkboxLabelVariants({ className, variant })}
      htmlFor={props.id}
    >
      <input {...props} type="checkbox" />
      {children}
    </label>
  );
}
