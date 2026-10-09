import { Fieldset } from "@/components/shared/Fieldset";
import { RowBetween, Stack } from "@/components/shared/Layout";
import { Hint } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { SearchBlocklistDiagnosticsPanelState } from "@/popup/panes/debug/useSearchBlocklistDiagnostics";

export type SearchBlocklistDiagnosticsSectionProps = {
  state: SearchBlocklistDiagnosticsPanelState;
};

export function SearchBlocklistDiagnosticsSection(
  props: SearchBlocklistDiagnosticsSectionProps
): React.JSX.Element {
  const { state } = props;
  return (
    <section className="settings-pane-card">
      <Fieldset legend={t("debug.searchBlocklist.title")} spacing="stack">
        {state.status === "ready" && (
          <Stack spacing="small">
            <RowBetween>
              <span>{t("debug.searchBlocklist.detectedCount")}</span>
              <span>{state.detectedCount}</span>
            </RowBetween>
            <RowBetween>
              <span>{t("debug.searchBlocklist.blockedCount")}</span>
              <span>{state.blockedCount}</span>
            </RowBetween>
            <RowBetween>
              <span>{t("debug.searchBlocklist.ruleRevision")}</span>
              <span>{state.ruleRevision}</span>
            </RowBetween>
            <RowBetween>
              <span>{t("debug.searchBlocklist.engineId")}</span>
              <span>{state.engineId}</span>
            </RowBetween>
          </Stack>
        )}
        {state.status === "unavailable" && (
          <Hint>{t("debug.searchBlocklist.empty")}</Hint>
        )}
        {state.status === "noSearchTab" && (
          <Hint>{t("debug.searchBlocklist.noSearchTab")}</Hint>
        )}
        {state.status === "loading" && (
          <Hint>{t("debug.searchBlocklist.loading")}</Hint>
        )}
        {state.status === "error" && (
          <Hint>{t("debug.searchBlocklist.unavailable")}</Hint>
        )}
      </Fieldset>
    </section>
  );
}
