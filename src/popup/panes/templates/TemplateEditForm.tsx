import { Button } from "@/components/shared/Button";
import { Form } from "@/components/shared/Form";
import { Input } from "@/components/shared/Input";
import { RowBetween } from "@/components/shared/Layout";
import { Textarea } from "@/components/shared/Textarea";
import { t } from "@/i18n";

export function TemplateEditForm(props: {
  titleInput: string;
  contentInput: string;
  onTitleInputChange: (value: string) => void;
  onContentInputChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  return (
    <Form onFormSubmit={props.onSave} variant="stack">
      <Input
        data-testid="template-title-input"
        onValueChange={props.onTitleInputChange}
        placeholder={t("templatesPane.titlePlaceholder")}
        type="text"
        value={props.titleInput}
        variant="pattern"
      />
      <Textarea
        data-testid="template-content-input"
        onChange={(e) => props.onContentInputChange(e.target.value)}
        placeholder={t("templatesPane.contentPlaceholder")}
        rows={4}
        value={props.contentInput}
        variant="pattern"
      />
      <RowBetween>
        <Button
          data-testid="save-template"
          onClick={props.onSave}
          size="small"
          type="button"
          variant="ghost"
        >
          {t("common.save")}
        </Button>
        <Button
          data-testid="cancel-edit"
          onClick={props.onCancel}
          size="small"
          type="button"
          variant="ghost"
        >
          {t("common.cancel")}
        </Button>
      </RowBetween>
    </Form>
  );
}
