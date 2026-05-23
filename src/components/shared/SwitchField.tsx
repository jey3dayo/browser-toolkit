import { Switch, type SwitchProps } from "@/components/shared/Switch";

export type SwitchFieldProps = Omit<SwitchProps, "id"> & {
  id: string;
  label: React.ReactNode;
};

export function SwitchField({
  id,
  label,
  ...props
}: SwitchFieldProps): React.JSX.Element {
  return (
    <div className="field">
      <label className="field-row" htmlFor={id}>
        <span className="field-name">{label}</span>
        <Switch id={id} {...props} />
      </label>
    </div>
  );
}
