import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("", {
  variants: {
    variant: {
      primary: "btn btn-primary",
      ghost: "btn btn-ghost",
      danger: "btn-delete",
      edit: "btn-edit",
      overlay: "mbu-overlay-action",
      overlayIcon: "mbu-overlay-action mbu-overlay-icon-button",
      overlayCopy:
        "mbu-overlay-action mbu-overlay-icon-button mbu-overlay-copy",
      overlaySettingsLink: "mbu-overlay-action mbu-overlay-settings-link",
      accordionCopy: "mbu-accordion-copy-btn",
      dragHandle: "drag-handle",
      expandIndicator: "expand-indicator",
      groupExpand: "group-expand-button",
      toastActionLink: "mbu-toast-action-link",
    },
    size: {
      default: null,
      small: "btn-small",
    },
  },
});

export type ButtonProps = Omit<
  React.ComponentProps<typeof BaseButton>,
  "className"
> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
  };

export function Button({
  className,
  size,
  variant,
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <BaseButton
      className={buttonVariants({ className, size, variant })}
      {...props}
    />
  );
}
