import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cva } from "class-variance-authority";

const switchVariants = cva("mbu-switch");

export type SwitchProps = Omit<
  React.ComponentProps<typeof BaseSwitch.Root>,
  "children" | "className"
> & {
  className?: string;
};

export function Switch({
  className,
  ...props
}: SwitchProps): React.JSX.Element {
  return (
    <BaseSwitch.Root className={switchVariants({ className })} {...props}>
      <BaseSwitch.Thumb className="mbu-switch-thumb" />
    </BaseSwitch.Root>
  );
}
