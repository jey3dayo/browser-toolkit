import { Dialog as BaseDialog } from "@base-ui/react/dialog";

export type DrawerDialogProps = Omit<
  React.ComponentProps<typeof BaseDialog.Root>,
  "children"
> & {
  backdropClassName?: string;
  children: React.ReactNode;
  popupAriaLabel: string;
  popupClassName?: string;
  trigger: React.ReactNode;
  triggerAriaLabel: string;
  triggerClassName?: string;
};

export function DrawerDialog({
  backdropClassName,
  children,
  popupAriaLabel,
  popupClassName,
  trigger,
  triggerAriaLabel,
  triggerClassName,
  ...props
}: DrawerDialogProps): React.JSX.Element {
  return (
    <BaseDialog.Root {...props}>
      <BaseDialog.Trigger
        aria-label={triggerAriaLabel}
        className={triggerClassName}
      >
        {trigger}
      </BaseDialog.Trigger>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={backdropClassName} />
        <BaseDialog.Popup
          aria-label={popupAriaLabel}
          className={popupClassName}
        >
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
