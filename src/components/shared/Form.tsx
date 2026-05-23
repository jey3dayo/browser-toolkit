import { Form as BaseForm } from "@base-ui/react/form";
import { cva, type VariantProps } from "class-variance-authority";

const formVariants = cva("", {
  variants: {
    variant: {
      patternGroup: "pattern-input-group",
      patternGroupWrap: "pattern-input-group pattern-input-group--wrap",
      stack: "stack",
    },
  },
});

export type FormProps = Omit<
  React.ComponentProps<typeof BaseForm>,
  "className"
> &
  VariantProps<typeof formVariants> & {
    className?: string;
  };

export function Form({
  className,
  variant,
  ...props
}: FormProps): React.JSX.Element {
  return (
    <BaseForm className={formVariants({ className, variant })} {...props} />
  );
}
