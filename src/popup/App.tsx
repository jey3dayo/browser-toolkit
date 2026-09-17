import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME } from "@/app_meta";
import { TabsPanel, TabsRoot } from "@/components/shared/Tabs";
import { t } from "@/i18n";
import {
  PopupContent,
  PopupContentBody,
  PopupContentHeader,
  PopupShell,
} from "@/popup/components/PopupLayout";
import { Sidebar } from "@/popup/components/Sidebar";
import { handleCopyTitleLinkFailureOnPopupOpen } from "@/popup/copy-title-link-failure";
import { replaceHashSafely } from "@/popup/hash";
import { navigationItems } from "@/popup/navigation-items";
import { coercePaneId, getPaneIdFromHash, type PaneId } from "@/popup/panes";
import { ActionsPane } from "@/popup/panes/ActionsPane";
import { CalendarPane } from "@/popup/panes/CalendarPane";
import { CreateLinkPane } from "@/popup/panes/CreateLinkPane";
import { HistoryPane } from "@/popup/panes/HistoryPane";
import { SearchBlocklistPane } from "@/popup/panes/SearchBlocklistPane";
import { SearchEnginesPane } from "@/popup/panes/SearchEnginesPane";
import { SearchGroupsPane } from "@/popup/panes/SearchGroupsPane";
import { SettingsPane } from "@/popup/panes/SettingsPane";
import { TablePane } from "@/popup/panes/TablePane";
import { TemplatesPane } from "@/popup/panes/TemplatesPane";
import { createPopupRuntime } from "@/popup/runtime";
import { createNotifications, ToastHost } from "@/ui/toast";
import type { LinkFormat } from "@/utils/link_format";

type CreateLinkInitialState = {
  link: {
    title: string;
    url: string;
  };
  format: LinkFormat;
} | null;

export function PopupApp(): React.JSX.Element {
  const initialValue = useMemo<PaneId>(
    () => getPaneIdFromHash(window.location.hash) ?? "pane-actions",
    []
  );
  const [tabValue, setTabValue] = useState<PaneId>(initialValue);
  const tokenInputRef = useRef<HTMLInputElement | null>(null);

  const runtime = useMemo(() => createPopupRuntime(), []);
  const notifications = useMemo(() => createNotifications(), []);

  const [createLinkInitial, setCreateLinkInitial] =
    useState<CreateLinkInitialState>(null);

  const focusTokenInput = useCallback(() => {
    window.setTimeout(() => {
      try {
        tokenInputRef.current?.focus();
      } catch {
        // no-op
      }
    }, 0);
  }, []);

  const navigateToPane = useCallback((paneId: PaneId) => {
    setTabValue(paneId);
  }, []);

  const handleTabValueChange = useCallback((value: string) => {
    setTabValue(coercePaneId(value));
  }, []);

  const syncFromHashRef = useRef<() => void>(() => {
    // no-op until the first render assigns the current handler
  });
  syncFromHashRef.current = () => {
    const next = getPaneIdFromHash(window.location.hash);
    if (!next) {
      return;
    }
    setTabValue(next);
  };

  useEffect(() => {
    const handleHashChange = () => {
      syncFromHashRef.current();
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    replaceHashSafely(window, `#${tabValue}`);
  }, [tabValue]);

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  const currentPaneLabel = useMemo(() => {
    const item = navigationItems.find(
      (navigationItem) => navigationItem.id === tabValue
    );
    return item ? t(item.labelKey) : APP_NAME;
  }, [tabValue]);

  useEffect(() => {
    handleCopyTitleLinkFailureOnPopupOpen({
      navigateToCreateLink: () => setTabValue("pane-create-link"),
      notify: notifications.notify,
      runtime,
      setCreateLinkInitial: (value) => setCreateLinkInitial(value),
    }).catch(() => {
      // no-op
    });
  }, [notifications.notify, runtime]);

  return (
    <TabsRoot onValueChange={handleTabValueChange} value={tabValue}>
      <PopupShell>
        <ToastHost
          placement="surface"
          portalContainer={document.body}
          toastManager={notifications.toastManager}
        />
        <PopupContent>
          <PopupContentHeader>
            <h1 className="content-title">{currentPaneLabel}</h1>
          </PopupContentHeader>

          <PopupContentBody>
            <TabsPanel value="pane-actions">
              <ActionsPane
                focusTokenInput={focusTokenInput}
                navigateToPane={navigateToPane}
                notify={notifications.notify}
                runtime={runtime}
              />
            </TabsPanel>
            <TabsPanel value="pane-calendar">
              <CalendarPane
                focusTokenInput={focusTokenInput}
                navigateToPane={navigateToPane}
                notify={notifications.notify}
                runtime={runtime}
              />
            </TabsPanel>
            <TabsPanel value="pane-table">
              <TablePane notify={notifications.notify} runtime={runtime} />
            </TabsPanel>
            <TabsPanel value="pane-create-link">
              <CreateLinkPane
                initialFormat={createLinkInitial?.format}
                initialLink={createLinkInitial?.link}
                notify={notifications.notify}
                runtime={runtime}
              />
            </TabsPanel>
            <TabsPanel value="pane-search-engines">
              <SearchEnginesPane
                notify={notifications.notify}
                runtime={runtime}
              />
            </TabsPanel>
            <TabsPanel value="pane-search-groups">
              <SearchGroupsPane
                notify={notifications.notify}
                runtime={runtime}
              />
            </TabsPanel>
            <TabsPanel value="pane-search-blocklist">
              <SearchBlocklistPane
                notify={notifications.notify}
                runtime={runtime}
              />
            </TabsPanel>
            <TabsPanel value="pane-templates">
              <TemplatesPane notify={notifications.notify} runtime={runtime} />
            </TabsPanel>
            <TabsPanel value="pane-history">
              <HistoryPane notify={notifications.notify} runtime={runtime} />
            </TabsPanel>
            <TabsPanel value="pane-settings">
              <SettingsPane
                notify={notifications.notify}
                runtime={runtime}
                tokenInputRef={tokenInputRef}
              />
            </TabsPanel>
          </PopupContentBody>
        </PopupContent>

        <Sidebar />
      </PopupShell>
    </TabsRoot>
  );
}
