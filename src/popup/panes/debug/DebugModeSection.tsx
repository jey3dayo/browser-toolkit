import { Fieldset } from "@/components/shared/Fieldset";
import { SwitchField } from "@/components/shared/SwitchField";
import { Hint } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { UseDebugLogsResult } from "@/popup/panes/debug/useDebugLogs";

export type DebugModeSectionProps = Pick<
  UseDebugLogsResult,
  "debugMode" | "logStats" | "handleToggleDebugMode"
>;

export function DebugModeSection(
  props: DebugModeSectionProps
): React.JSX.Element {
  const { debugMode, logStats, handleToggleDebugMode } = props;
  return (
    <section className="settings-pane-card">
      <Fieldset legend={t("debug.mode")} spacing="stack">
        <SwitchField
          checked={debugMode}
          data-testid="debug-mode-switch"
          id="debug-mode-switch"
          label={t("debug.modeToggle")}
          onCheckedChange={handleToggleDebugMode}
        />
        <Hint>
          {t("debug.enabledDescription")} {t("debug.disabledDescription")}
        </Hint>
      </Fieldset>

      {debugMode && logStats && (
        <Hint as="div" className="settings-status-note">
          {t("debug.stats", {
            entryCount: logStats.entryCount,
            sizeKB: logStats.sizeKB,
          })}
        </Hint>
      )}
    </section>
  );
}
