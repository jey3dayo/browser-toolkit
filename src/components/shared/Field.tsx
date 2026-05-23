export type FieldProps = {
  children: React.ReactNode;
  htmlFor?: string;
  label: React.ReactNode;
  labelAccessory?: React.ReactNode;
  labelId?: string;
};

export function Field({
  children,
  htmlFor,
  label,
  labelAccessory,
  labelId,
}: FieldProps): React.JSX.Element {
  const labelName = htmlFor ? (
    <label className="field-name" htmlFor={htmlFor} id={labelId}>
      {label}
    </label>
  ) : (
    <span className="field-name" id={labelId}>
      {label}
    </span>
  );
  const labelElement = labelAccessory ? (
    <div className="field-row">
      {labelName}
      {labelAccessory}
    </div>
  ) : (
    labelName
  );

  return (
    <div className="field">
      {labelElement}
      {children}
    </div>
  );
}
