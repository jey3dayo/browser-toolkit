import {
  type HTMLInputTypeAttribute,
  type ReactNode,
  useCallback,
  useId,
} from "react";
import { Button } from "@/components/shared/Button";
import { Form } from "@/components/shared/Form";
import { Input } from "@/components/shared/Input";
import { Stack } from "@/components/shared/Layout";
import { Hint } from "@/components/shared/Typography";
import { t } from "@/i18n";

type PatternAddFormProps = {
  buttonLabel?: ReactNode;
  buttonTestId?: string;
  disabled?: boolean;
  errorMessage?: string;
  errorTestId?: string;
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
  errorMessage,
  errorTestId,
  inputTestId,
  inputType = "text",
  onSubmit,
  onSubmitError,
  onValueChange,
  placeholder,
  value,
}: PatternAddFormProps): React.JSX.Element {
  const errorId = useId();
  const handleSubmit = useCallback((): void => {
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
  }, [disabled, onSubmit, onSubmitError]);

  return (
    <Stack spacing="small">
      <Form onFormSubmit={handleSubmit} variant="patternGroup">
        <Input
          aria-describedby={errorMessage ? errorId : undefined}
          aria-invalid={errorMessage ? "true" : undefined}
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
      {errorMessage ? (
        <Hint
          as="div"
          className="hint--danger"
          data-testid={errorTestId}
          id={errorId}
        >
          {errorMessage}
        </Hint>
      ) : null}
    </Stack>
  );
}
