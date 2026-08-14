import { useCallback } from "react";
import { SortableList } from "@/components/SortableList";
import { Button } from "@/components/shared/Button";
import { ListItemRow } from "@/components/shared/ListItemRow";
import { Switch } from "@/components/shared/Switch";
import { EmptyMessage } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { TextTemplate } from "@/text_templates";

type TemplateRowProps = {
  template: TextTemplate;
  onToggleHidden: (templateId: string, hidden: boolean) => void;
  onEdit: (template: TextTemplate) => void;
  onRemove: (templateId: string) => void;
};

function TemplateRow({
  template,
  onToggleHidden,
  onEdit,
  onRemove,
}: TemplateRowProps): React.JSX.Element {
  const handleToggleHidden = useCallback(
    (checked: boolean) => {
      onToggleHidden(template.id, !checked);
    },
    [onToggleHidden, template.id]
  );
  const handleEdit = useCallback(() => {
    onEdit(template);
  }, [onEdit, template]);
  const handleRemove = useCallback(() => {
    onRemove(template.id);
  }, [onRemove, template.id]);

  return (
    <ListItemRow
      actions={
        <>
          <Switch
            aria-label={t("templatesPane.visibleAria", {
              title: template.title,
            })}
            checked={!template.hidden}
            data-testid={`template-visible-${template.id}`}
            onCheckedChange={handleToggleHidden}
          />
          <Button
            data-testid={`edit-template-${template.id}`}
            onClick={handleEdit}
            type="button"
            variant="edit"
          >
            {t("common.edit")}
          </Button>
          <Button
            data-testid={`remove-template-${template.id}`}
            onClick={handleRemove}
            type="button"
            variant="danger"
          >
            {t("common.delete")}
          </Button>
        </>
      }
      meta={template.content}
      title={template.title}
    />
  );
}

export function TemplateList(props: {
  templates: TextTemplate[];
  onReorder: (reordered: TextTemplate[]) => void;
  onToggleHidden: (templateId: string, hidden: boolean) => void;
  onEdit: (template: TextTemplate) => void;
  onRemove: (templateId: string) => void;
}): React.JSX.Element {
  if (props.templates.length === 0) {
    return <EmptyMessage>{t("templatesPane.empty")}</EmptyMessage>;
  }

  return (
    <SortableList items={props.templates} onReorder={props.onReorder}>
      {(template) => (
        <TemplateRow
          onEdit={props.onEdit}
          onRemove={props.onRemove}
          onToggleHidden={props.onToggleHidden}
          template={template}
        />
      )}
    </SortableList>
  );
}
