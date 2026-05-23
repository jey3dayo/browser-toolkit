import { Popover as BasePopover } from "@base-ui/react/popover";

export type HelpPopoverProps = {
  ariaLabel: string;
  description: React.ReactNode;
  title: React.ReactNode;
  triggerLabel?: React.ReactNode;
  sideOffset?: React.ComponentProps<
    typeof BasePopover.Positioner
  >["sideOffset"];
};

export function HelpPopover(props: HelpPopoverProps): React.JSX.Element {
  return (
    <BasePopover.Root>
      <BasePopover.Trigger
        aria-label={props.ariaLabel}
        className="mbu-popover-trigger"
        type="button"
      >
        {props.triggerLabel ?? "?"}
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner
          className="mbu-popover-positioner"
          sideOffset={props.sideOffset ?? 6}
        >
          <BasePopover.Popup className="mbu-popover">
            <BasePopover.Title className="mbu-popover-title">
              {props.title}
            </BasePopover.Title>
            <BasePopover.Description className="mbu-popover-description">
              {props.description}
            </BasePopover.Description>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
