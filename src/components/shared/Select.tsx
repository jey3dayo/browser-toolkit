import { Select as BaseSelect } from "@base-ui/react/select";
import { cva, type VariantProps } from "class-variance-authority";

export type SelectOption = {
  label: React.ReactNode;
  value: string | null;
};

const selectTriggerVariants = cva("", {
  variants: {
    variant: {
      pattern: "pattern-input mbu-select-trigger",
      token: "token-input mbu-select-trigger",
    },
  },
});

export type SelectProps = Omit<
  React.ComponentProps<typeof BaseSelect.Root<string | null>>,
  "children" | "items" | "onValueChange" | "value"
> &
  VariantProps<typeof selectTriggerVariants> & {
    ariaLabel?: string;
    ariaLabelledBy?: string;
    className?: string;
    onValueChange: (value: string | null) => void;
    options: SelectOption[];
    positionerSideOffset?: number;
    triggerId?: string;
    triggerTestId?: string;
    value: string | null;
  };

export function Select({
  ariaLabel,
  ariaLabelledBy,
  className,
  onValueChange,
  options,
  positionerSideOffset = 6,
  triggerId,
  triggerTestId,
  value,
  variant,
  ...rootProps
}: SelectProps): React.JSX.Element {
  return (
    <BaseSelect.Root
      items={options}
      onValueChange={(nextValue) => {
        onValueChange(nextValue);
      }}
      value={value}
      {...rootProps}
    >
      <BaseSelect.Trigger
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={selectTriggerVariants({ className, variant })}
        data-testid={triggerTestId}
        id={triggerId}
        type="button"
      >
        <BaseSelect.Value className="mbu-select-value" />
        <BaseSelect.Icon className="mbu-select-icon">▾</BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className="mbu-select-positioner"
          sideOffset={positionerSideOffset}
        >
          <BaseSelect.Popup className="mbu-select-popup">
            <BaseSelect.List className="mbu-select-list">
              {options.map((option) => (
                <BaseSelect.Item
                  className="mbu-select-item"
                  key={
                    option.value === null ? "null:" : `string:${option.value}`
                  }
                  value={option.value}
                >
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="mbu-select-indicator">
                    ✓
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
