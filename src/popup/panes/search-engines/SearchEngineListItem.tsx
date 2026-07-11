import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ListItemRow } from "@/components/shared/ListItemRow";
import { Switch } from "@/components/shared/Switch";
import { t } from "@/i18n";
import { ENCODING_LABELS, type SearchEngine } from "@/search_engine_types";
import { BUILTIN_SEARCH_ENGINE_ID_PREFIX } from "@/search_engines";

export type SearchEngineListItemProps = {
  engine: SearchEngine;
  onToggleEnabled: (engineId: string, checked: boolean) => Promise<void>;
  onRemove: (engineId: string) => Promise<void>;
};

export function SearchEngineListItem(
  props: SearchEngineListItemProps
): React.JSX.Element {
  const { engine } = props;

  return (
    <ListItemRow
      actions={
        <>
          <Switch
            aria-label={t("searchEngines.enableAria", { name: engine.name })}
            checked={engine.enabled}
            data-testid={`engine-enabled-${engine.id}`}
            onCheckedChange={(checked) => {
              props.onToggleEnabled(engine.id, checked).catch(() => {
                // no-op
              });
            }}
          />
          {!engine.id.startsWith(BUILTIN_SEARCH_ENGINE_ID_PREFIX) && (
            <Button
              data-testid={`remove-engine-${engine.id}`}
              onClick={() => {
                props.onRemove(engine.id).catch(() => {
                  // no-op
                });
              }}
              type="button"
              variant="danger"
            >
              {t("common.delete")}
            </Button>
          )}
        </>
      }
      meta={engine.urlTemplate}
      title={
        <>
          {engine.name}
          {engine.encoding && engine.encoding !== "utf-8" && (
            <Badge variant="badgeInfo">
              {ENCODING_LABELS[engine.encoding]}
            </Badge>
          )}
        </>
      }
    />
  );
}
