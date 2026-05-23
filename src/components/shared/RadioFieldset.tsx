import { Field } from "@base-ui/react/field";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Fieldset } from "@/components/shared/Fieldset";

export type RadioFieldsetOption = {
  label: React.ReactNode;
  value: string;
};

export type RadioFieldsetOptionGroup = {
  className?: string;
  options: RadioFieldsetOption[];
  testId?: string;
};

export type RadioFieldsetProps = {
  groups: RadioFieldsetOptionGroup[];
  legend: React.ReactNode;
  name: string;
  onValueChange: (value: string) => Promise<void> | void;
  radioGroupClassName?: string;
  value: string;
};

export function RadioFieldset(props: RadioFieldsetProps): React.JSX.Element {
  return (
    <Field.Root name={props.name}>
      <Fieldset
        legend={props.legend}
        render={
          <RadioGroup
            className={
              props.radioGroupClassName ??
              "mbu-radio-group mbu-radio-group--horizontal"
            }
            onValueChange={props.onValueChange}
            value={props.value}
          />
        }
      >
        {props.groups.map((group) => (
          <div
            className={group.className}
            data-testid={group.testId}
            key={group.options.map((option) => option.value).join(":")}
          >
            {group.options.map((option) => (
              <Field.Item key={option.value}>
                <Field.Label className="mbu-radio-label">
                  <Radio.Root className="mbu-radio-root" value={option.value}>
                    <Radio.Indicator className="mbu-radio-indicator" />
                  </Radio.Root>
                  {option.label}
                </Field.Label>
              </Field.Item>
            ))}
          </div>
        ))}
      </Fieldset>
    </Field.Root>
  );
}
