import { Dialog as BaseDialog } from "@base-ui/react/dialog";

export type DialogPortalContainer = React.ComponentProps<
  typeof BaseDialog.Portal
>["container"];

export type DrawerDialogInitialFocus = React.ComponentProps<
  typeof BaseDialog.Popup
>["initialFocus"];

export type DrawerDialogProps = Omit<
  React.ComponentProps<typeof BaseDialog.Root>,
  "children"
> & {
  backdropClassName?: string;
  children: React.ReactNode;
  initialFocus?: DrawerDialogInitialFocus;
  popupAriaLabel: string;
  popupClassName?: string;
  popupRef?: React.Ref<HTMLDivElement>;
  portalContainer?: DialogPortalContainer;
  trigger: React.ReactNode;
  triggerAriaLabel: string;
  triggerClassName?: string;
  triggerRef?: React.Ref<HTMLButtonElement>;
};

export function DrawerDialog({
  backdropClassName,
  children,
  initialFocus,
  popupAriaLabel,
  popupClassName,
  popupRef,
  portalContainer,
  trigger,
  triggerAriaLabel,
  triggerClassName,
  triggerRef,
  ...props
}: DrawerDialogProps): React.JSX.Element {
  return (
    <BaseDialog.Root {...props}>
      <BaseDialog.Trigger
        aria-label={triggerAriaLabel}
        className={triggerClassName}
        ref={triggerRef}
      >
        {trigger}
      </BaseDialog.Trigger>
      <BaseDialog.Portal container={portalContainer}>
        <BaseDialog.Backdrop className={backdropClassName} />
        <BaseDialog.Popup
          aria-label={popupAriaLabel}
          className={popupClassName}
          initialFocus={initialFocus}
          ref={popupRef}
        >
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
