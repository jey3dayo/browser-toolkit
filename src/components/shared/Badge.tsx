import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva("", {
  variants: {
    variant: {
      actionKind: "action-kind-badge",
      badgeInfo: "badge badge-info",
      chipSoft: "chip chip-soft",
      focusDiagnosticActive:
        "focus-diagnostic-status focus-diagnostic-status--active",
      focusDiagnosticNeutral:
        "focus-diagnostic-status focus-diagnostic-status--neutral",
      focusDiagnosticWarning:
        "focus-diagnostic-status focus-diagnostic-status--warning",
    },
  },
});

export type BadgeProps = Omit<
  React.ComponentPropsWithoutRef<"span">,
  "className"
> &
  VariantProps<typeof badgeVariants> & {
    className?: string;
  };

export function Badge({
  className,
  variant,
  ...props
}: BadgeProps): React.JSX.Element {
  return <span className={badgeVariants({ className, variant })} {...props} />;
}
