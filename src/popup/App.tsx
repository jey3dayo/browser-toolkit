import { Result } from "@praha/byethrow";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_NAME } from "@/app_meta";
import { TabsPanel, TabsRoot } from "@/components/shared/Tabs";
import { i18n } from "@/i18n";
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
import {
  canSurfaceRender,
  coercePaneId,
  type PaneId,
  type PaneNavigator,
  type PaneSurface,
  parsePaneHash,
  resolvePaneIdForSurface,
} from "@/popup/panes";
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

export type PopupAppProps = {
  surface?: PaneSurface;
};

export function PopupApp({
  surface = "popup",
}: PopupAppProps): React.JSX.Element {
  const { t } = useTranslation(undefined, { i18n });

  const initialHash = useMemo(() => parsePaneHash(window.location.hash), []);
  const [tabValue, setTabValue] = useState<PaneId>(() =>
    resolvePaneIdForSurface(initialHash.paneId, surface)
  );
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

  const navigate = useCallback<PaneNavigator>(
    (paneId, options) => {
      if (canSurfaceRender(surface, paneId)) {
        setTabValue(paneId);
        if (options?.focus === "token") {
          focusTokenInput();
        }
        return;
      }

      runtime
        .openOptionsPane(paneId, options)
        .then((result) => {
          if (Result.isFailure(result)) {
            notifications.notify.error(result.error);
            return;
          }
          if (surface === "popup") {
            window.close();
          }
        })
        .catch((error: unknown) => {
          notifications.notify.error(
            error instanceof Error ? error.message : String(error)
          );
        });
    },
    [focusTokenInput, notifications.notify, runtime, surface]
  );

  const openSettingsSurface = useCallback(() => {
    navigate("pane-settings");
  }, [navigate]);

  const handleTabValueChange = useCallback(
    (value: string) => {
      setTabValue(resolvePaneIdForSurface(coercePaneId(value), surface));
    },
    [surface]
  );

  const syncFromHashRef = useRef<() => void>(() => {
    // no-op until the first render assigns the current handler
  });
  syncFromHashRef.current = () => {
    const next = parsePaneHash(window.location.hash).paneId;
    if (!(next && canSurfaceRender(surface, next))) {
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
    if (surface !== "options" || !initialHash.focusToken) {
      return;
    }
    focusTokenInput();
  }, [focusTokenInput, initialHash.focusToken, surface]);

  const currentNavigationItem = navigationItems.find(
    (navigationItem) => navigationItem.id === tabValue
  );
  const currentPaneLabel = currentNavigationItem
    ? t(currentNavigationItem.labelKey)
    : APP_NAME;

  useEffect(() => {
    document.title =
      surface === "options" ? `${currentPaneLabel} - ${APP_NAME}` : APP_NAME;
  }, [currentPaneLabel, surface]);

  useEffect(() => {
    if (surface !== "popup") {
      return;
    }
    handleCopyTitleLinkFailureOnPopupOpen({
      navigateToCreateLink: () => setTabValue("pane-create-link"),
      notify: notifications.notify,
      runtime,
      setCreateLinkInitial: (value) => setCreateLinkInitial(value),
    }).catch(() => {
      // no-op
    });
  }, [notifications.notify, runtime, surface]);

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
                navigate={navigate}
                notify={notifications.notify}
                runtime={runtime}
              />
            </TabsPanel>
            <TabsPanel value="pane-calendar">
              <CalendarPane
                navigate={navigate}
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
            <TabsPanel value="pane-search-blocklist">
              <SearchBlocklistPane
                notify={notifications.notify}
                runtime={runtime}
              />
            </TabsPanel>
            {surface === "options" ? (
              <>
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
                <TabsPanel value="pane-templates">
                  <TemplatesPane
                    notify={notifications.notify}
                    runtime={runtime}
                  />
                </TabsPanel>
                <TabsPanel value="pane-history">
                  <HistoryPane
                    notify={notifications.notify}
                    runtime={runtime}
                  />
                </TabsPanel>
                <TabsPanel value="pane-settings">
                  <SettingsPane
                    notify={notifications.notify}
                    runtime={runtime}
                    tokenInputRef={tokenInputRef}
                  />
                </TabsPanel>
              </>
            ) : null}
          </PopupContentBody>
        </PopupContent>

        <Sidebar onOpenOptions={openSettingsSurface} surface={surface} />
      </PopupShell>
    </TabsRoot>
  );
}
