import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";

const toggleVariants = cva("", {
  variants: {
    variant: {
      default: "mbu-toggle",
      inline: "mbu-toggle mbu-toggle-inline",
      icon: "input-icon-toggle",
      groupItem: "mbu-toggle-group-item",
    },
  },
});

const toggleGroupVariants = cva("", {
  variants: {
    variant: {
      default: "mbu-toggle-group",
    },
  },
});

export type ToggleProps = Omit<
  React.ComponentProps<typeof BaseToggle>,
  "className"
> &
  VariantProps<typeof toggleVariants> & {
    className?: string;
  };

export function Toggle({
  className,
  variant,
  ...props
}: ToggleProps): React.JSX.Element {
  return (
    <BaseToggle className={toggleVariants({ className, variant })} {...props} />
  );
}

export type ToggleGroupProps = Omit<
  React.ComponentProps<typeof BaseToggleGroup>,
  "className"
> &
  VariantProps<typeof toggleGroupVariants> & {
    className?: string;
  };

export function ToggleGroup({
  className,
  variant,
  ...props
}: ToggleGroupProps): React.JSX.Element {
  return (
    <BaseToggleGroup
      className={toggleGroupVariants({ className, variant })}
      {...props}
    />
  );
}
