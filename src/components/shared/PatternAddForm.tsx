import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { Button } from "@/components/shared/Button";
import { Form } from "@/components/shared/Form";
import { Input } from "@/components/shared/Input";

type PatternAddFormProps = {
  buttonLabel?: ReactNode;
  buttonTestId?: string;
  disabled?: boolean;
  inputTestId?: string;
  inputType?: HTMLInputTypeAttribute;
  onSubmit: () => Promise<void> | void;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export function PatternAddForm({
  buttonLabel = "追加",
  buttonTestId,
  disabled = false,
  inputTestId,
  inputType = "text",
  onSubmit,
  onValueChange,
  placeholder,
  value,
}: PatternAddFormProps): React.JSX.Element {
  const handleSubmit = (): void => {
    if (disabled) {
      return;
    }
    try {
      Promise.resolve(onSubmit()).catch(() => {
        // no-op
      });
    } catch {
      // no-op
    }
  };

  return (
    <Form onFormSubmit={handleSubmit} variant="patternGroup">
      <Input
        data-testid={inputTestId}
        onValueChange={onValueChange}
        placeholder={placeholder}
        type={inputType}
        value={value}
        variant="pattern"
      />
      <Button
        data-testid={buttonTestId}
        disabled={disabled}
        size="small"
        type="submit"
        variant="ghost"
      >
        {buttonLabel}
      </Button>
    </Form>
  );
}
