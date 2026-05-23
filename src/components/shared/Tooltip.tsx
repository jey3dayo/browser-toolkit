import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";

export type TooltipProps = {
  children: React.ReactElement;
  content: React.ReactNode;
  sideOffset?: React.ComponentProps<
    typeof BaseTooltip.Positioner
  >["sideOffset"];
};

export function Tooltip(props: TooltipProps): React.JSX.Element {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={props.children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          className="mbu-tooltip-positioner"
          sideOffset={props.sideOffset ?? 6}
        >
          <BaseTooltip.Popup className="mbu-tooltip">
            {props.content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
