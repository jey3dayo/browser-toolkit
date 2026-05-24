import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { Button } from "@/components/shared/Button";
import { Form } from "@/components/shared/Form";
import { Input } from "@/components/shared/Input";
import { t } from "@/i18n";

type PatternAddFormProps = {
  buttonLabel?: ReactNode;
  buttonTestId?: string;
  disabled?: boolean;
  inputTestId?: string;
  inputType?: HTMLInputTypeAttribute;
  onSubmit: () => Promise<void> | void;
  onSubmitError: (error: unknown) => void;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export function PatternAddForm({
  buttonLabel,
  buttonTestId,
  disabled = false,
  inputTestId,
  inputType = "text",
  onSubmit,
  onSubmitError,
  onValueChange,
  placeholder,
  value,
}: PatternAddFormProps): React.JSX.Element {
  const handleSubmit = (): void => {
    if (disabled) {
      return;
    }
    try {
      Promise.resolve(onSubmit()).catch((error: unknown) => {
        onSubmitError(error);
      });
    } catch (error) {
      onSubmitError(error);
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
        {buttonLabel ?? t("common.add")}
      </Button>
    </Form>
  );
}
