import { useMemo } from "react";
import { Button } from "@/components/shared/Button";
import { PatternListItem } from "@/components/shared/PatternListItem";
import { Switch } from "@/components/shared/Switch";
import { Tooltip } from "@/components/shared/Tooltip";
import type { DomainPatternConfig } from "@/domain-pattern-configs";
import { t } from "@/i18n";

export type PatternConfigListItemProps = {
  config: DomainPatternConfig;
  rowFilterTooltip: string;
  onRemove: (pattern: string) => Promise<void>;
  onToggleRowFilter: (pattern: string, checked: boolean) => Promise<void>;
};

export function PatternConfigListItem({
  config,
  rowFilterTooltip,
  onRemove,
  onToggleRowFilter,
}: PatternConfigListItemProps): React.JSX.Element {
  const action = useMemo(
    () => (
      <Button
        data-pattern-remove={config.pattern}
        onClick={() => {
          onRemove(config.pattern).catch(() => {
            // no-op
          });
        }}
        type="button"
        variant="danger"
      >
        {t("common.delete")}
      </Button>
    ),
    [config.pattern, onRemove]
  );
  const toggle = useMemo(
    () => (
      <Tooltip content={rowFilterTooltip}>
        <Switch
          aria-label={t("tablePane.rowFilter.aria", {
            pattern: config.pattern,
          })}
          checked={config.enableRowFilter}
          data-testid={`row-filter-${config.pattern}`}
          onCheckedChange={(checked) => {
            onToggleRowFilter(config.pattern, checked).catch(() => {
              // no-op
            });
          }}
        />
      </Tooltip>
    ),
    [
      config.enableRowFilter,
      config.pattern,
      onToggleRowFilter,
      rowFilterTooltip,
    ]
  );

  return (
    <PatternListItem
      action={action}
      key={config.pattern}
      pattern={config.pattern}
      toggle={toggle}
    />
  );
}
