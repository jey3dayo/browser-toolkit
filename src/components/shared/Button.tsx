import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("", {
  variants: {
    size: {
      default: null,
      small: "btn-small",
    },
    variant: {
      accordionCopy: "mbu-accordion-copy-btn",
      danger: "btn-delete",
      dragHandle: "drag-handle",
      edit: "btn-edit",
      expandIndicator: "expand-indicator",
      ghost: "btn btn-ghost",
      groupExpand: "group-expand-button",
      overlay: "mbu-overlay-action",
      overlayCopy:
        "mbu-overlay-action mbu-overlay-icon-button mbu-overlay-copy",
      overlayIcon: "mbu-overlay-action mbu-overlay-icon-button",
      overlaySettingsLink: "mbu-overlay-action mbu-overlay-settings-link",
      primary: "btn btn-primary",
      toastActionLink: "mbu-toast-action-link",
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
