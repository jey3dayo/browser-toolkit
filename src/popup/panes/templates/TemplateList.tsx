import { SortableList } from "@/components/SortableList";
import { Button } from "@/components/shared/Button";
import { ListItemRow } from "@/components/shared/ListItemRow";
import { Switch } from "@/components/shared/Switch";
import { EmptyMessage } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { TextTemplate } from "@/text_templates";

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
        <ListItemRow
          actions={
            <>
              <Switch
                aria-label={t("templatesPane.visibleAria", {
                  title: template.title,
                })}
                checked={!template.hidden}
                data-testid={`template-visible-${template.id}`}
                onCheckedChange={(checked) => {
                  props.onToggleHidden(template.id, !checked);
                }}
              />
              <Button
                data-testid={`edit-template-${template.id}`}
                onClick={() => {
                  props.onEdit(template);
                }}
                type="button"
                variant="edit"
              >
                {t("common.edit")}
              </Button>
              <Button
                data-testid={`remove-template-${template.id}`}
                onClick={() => {
                  props.onRemove(template.id);
                }}
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
      )}
    </SortableList>
  );
}
