import { useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { ButtonRow, RowBetween } from "@/components/shared/Layout";
import { PatternListItem } from "@/components/shared/PatternListItem";
import { t } from "@/i18n";
import type { SearchBlocklistRule } from "@/search-blocklist/types";

export type SearchBlocklistListItemProps = {
  rule: SearchBlocklistRule;
  isEditing: boolean;
  editingValue: string;
  onEditingValueChange: (value: string) => void;
  onStartEditing: (rule: SearchBlocklistRule) => void;
  onCancelEditing: () => void;
  onSaveEditing: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
};

type InlineEditRowProps = {
  ruleId: string;
  value: string;
  onValueChange: (value: string) => void;
  onSave: (id: string) => Promise<void>;
  onCancel: () => void;
};

function InlineEditRow({
  ruleId,
  value,
  onValueChange,
  onSave,
  onCancel,
}: InlineEditRowProps): React.JSX.Element {
  const save = useCallback(() => {
    onSave(ruleId).catch(() => {
      // no-op
    });
  }, [onSave, ruleId]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        save();
      }
      if (event.key === "Escape") {
        onCancel();
      }
    },
    [onCancel, save]
  );

  return (
    <li>
      <RowBetween>
        <Input
          autoFocus
          data-testid={`search-blocklist-edit-input-${ruleId}`}
          onKeyDown={handleKeyDown}
          onValueChange={onValueChange}
          type="text"
          value={value}
          variant="pattern"
        />
        <ButtonRow>
          <Button
            data-testid={`search-blocklist-save-${ruleId}`}
            onClick={save}
            size="small"
            type="button"
            variant="ghost"
          >
            {t("common.save")}
          </Button>
          <Button onClick={onCancel} size="small" type="button" variant="ghost">
            {t("common.cancel")}
          </Button>
        </ButtonRow>
      </RowBetween>
    </li>
  );
}

export function SearchBlocklistListItem({
  rule,
  isEditing,
  editingValue,
  onEditingValueChange,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onRemove,
}: SearchBlocklistListItemProps): React.JSX.Element {
  const handleStartEditing = useCallback(() => {
    onStartEditing(rule);
  }, [onStartEditing, rule]);

  const handleRemove = useCallback(() => {
    onRemove(rule.id).catch(() => {
      // no-op
    });
  }, [onRemove, rule.id]);

  if (isEditing) {
    return (
      <InlineEditRow
        onCancel={onCancelEditing}
        onSave={onSaveEditing}
        onValueChange={onEditingValueChange}
        ruleId={rule.id}
        value={editingValue}
      />
    );
  }

  return (
    <PatternListItem
      action={
        <>
          <Button
            data-testid={`search-blocklist-edit-${rule.id}`}
            onClick={handleStartEditing}
            size="small"
            type="button"
            variant="edit"
          >
            {t("common.edit")}
          </Button>
          <Button
            data-testid={`search-blocklist-delete-${rule.id}`}
            onClick={handleRemove}
            size="small"
            type="button"
            variant="danger"
          >
            {t("common.delete")}
          </Button>
        </>
      }
      pattern={rule.pattern}
    />
  );
}
