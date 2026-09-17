import { Accordion } from "@/components/shared/Accordion";
import { PaneCard } from "@/components/shared/Layout";
import { Hint } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { DebugPane } from "@/popup/panes/DebugPane";
import { SettingsModelSection } from "@/popup/panes/settings/SettingsModelSection";
import { SettingsPaneOverview } from "@/popup/panes/settings/SettingsPaneLayout";
import { SettingsPromptSection } from "@/popup/panes/settings/SettingsPromptSection";
import { SettingsProviderSection } from "@/popup/panes/settings/SettingsProviderSection";
import { SettingsThemeSection } from "@/popup/panes/settings/SettingsThemeSection";
import { SettingsTokenSection } from "@/popup/panes/settings/SettingsTokenSection";
import { useSettingsState } from "@/popup/panes/settings/useSettingsState";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { PROVIDER_CONFIGS } from "@/schemas/provider";

export type SettingsPaneProps = PopupPaneBaseProps & {
  tokenInputRef: React.RefObject<HTMLInputElement | null>;
};

export function SettingsPane(props: SettingsPaneProps): React.JSX.Element {
  const state = useSettingsState({
    notify: props.notify,
    runtime: props.runtime,
  });

  return (
    <PaneCard className="settings-surface settings-pane">
      <SettingsPaneOverview>
        <Hint>{t("settings.description")}</Hint>
      </SettingsPaneOverview>

      <SettingsProviderSection
        provider={state.provider}
        runtime={props.runtime}
        saveModel={state.saveModel}
        saveProvider={state.saveProvider}
        setModel={state.setModel}
        setProvider={state.setProvider}
        setToken={state.setToken}
      />

      <SettingsTokenSection
        clearToken={state.clearToken}
        provider={state.provider}
        providerConfigs={PROVIDER_CONFIGS}
        saveToken={state.saveToken}
        setShowToken={state.setShowToken}
        setToken={state.setToken}
        showToken={state.showToken}
        testToken={state.testToken}
        token={state.token}
        tokenInputId={state.tokenInputId}
        tokenInputRef={props.tokenInputRef}
      />

      <SettingsModelSection
        model={state.model}
        provider={state.provider}
        providerConfigs={PROVIDER_CONFIGS}
        saveModel={state.saveModel}
        setModel={state.setModel}
      />

      <SettingsPromptSection
        clearPrompt={state.clearPrompt}
        customPrompt={state.customPrompt}
        promptInputId={state.promptInputId}
        savePrompt={state.savePrompt}
        setCustomPrompt={state.setCustomPrompt}
      />

      <SettingsThemeSection
        saveTheme={state.saveTheme}
        setTheme={state.setTheme}
        theme={state.theme}
      />

      <section className="settings-pane-card">
        <Accordion
          defaultOpen={false}
          itemValue="debug"
          title={t("settings.debugSection")}
        >
          <DebugPane notify={props.notify} runtime={props.runtime} />
        </Accordion>
      </section>
    </PaneCard>
  );
}
