import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import { cva, type VariantProps } from "class-variance-authority";

const fieldsetVariants = cva("mbu-fieldset", {
  variants: {
    spacing: {
      none: null,
      stack: "stack",
    },
    variant: {
      default: null,
      editor: "editor-form",
    },
  },
});

const legendVariants = cva("", {
  variants: {
    variant: {
      default: "mbu-fieldset-legend",
      editor: "editor-title",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type FieldsetProps = Omit<
  React.ComponentProps<typeof BaseFieldset.Root>,
  "className"
> &
  VariantProps<typeof fieldsetVariants> & {
    className?: string;
    legend?: React.ReactNode;
    legendClassName?: string;
    legendVariant?: VariantProps<typeof legendVariants>["variant"];
  };

export function Fieldset({
  children,
  className,
  legend,
  legendClassName,
  legendVariant,
  spacing,
  variant,
  ...props
}: FieldsetProps): React.JSX.Element {
  return (
    <BaseFieldset.Root
      className={fieldsetVariants({ className, spacing, variant })}
      {...props}
    >
      {legend ? (
        <BaseFieldset.Legend
          className={legendVariants({
            className: legendClassName,
            variant: legendVariant,
          })}
        >
          {legend}
        </BaseFieldset.Legend>
      ) : null}
      {children}
    </BaseFieldset.Root>
  );
}
