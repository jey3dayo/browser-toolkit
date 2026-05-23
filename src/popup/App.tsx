import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME } from "@/app_meta";
import { TabsPanel, TabsRoot } from "@/components/shared/Tabs";
import {
  PopupContent,
  PopupContentBody,
  PopupContentHeader,
  PopupShell,
  PopupTitleBlock,
} from "@/popup/components/PopupLayout";
import { Sidebar } from "@/popup/components/Sidebar";
import { handleCopyTitleLinkFailureOnPopupOpen } from "@/popup/copy-title-link-failure";
import { replaceHashSafely } from "@/popup/hash";
import { coercePaneId, getPaneIdFromHash, type PaneId } from "@/popup/panes";
import { ActionsPane } from "@/popup/panes/ActionsPane";
import { CalendarPane } from "@/popup/panes/CalendarPane";
import { CreateLinkPane } from "@/popup/panes/CreateLinkPane";
import { DebugPane } from "@/popup/panes/DebugPane";
import { HistoryPane } from "@/popup/panes/HistoryPane";
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
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
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

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen]);

  useEffect(() => {
    handleCopyTitleLinkFailureOnPopupOpen({
      runtime,
      notify: notifications.notify,
      setCreateLinkInitial: (value) => setCreateLinkInitial(value),
      navigateToCreateLink: () => setTabValue("pane-create-link"),
    }).catch(() => {
      // no-op
    });
  }, [notifications.notify, runtime]);

  return (
    <TabsRoot
      onValueChange={(value) => {
        setTabValue(coercePaneId(value));
        setMenuOpen(false);
      }}
      value={tabValue}
    >
      <PopupShell>
        <ToastHost
          placement="surface"
          portalContainer={document.body}
          toastManager={notifications.toastManager}
        />
        <PopupContent>
          <PopupContentHeader>
            <PopupTitleBlock>
              <div className="hero-logo-wrap">
                <img
                  alt={APP_NAME}
                  className="hero-logo"
                  height={32}
                  src="images/icon48.png"
                  width={32}
                />
              </div>
              <div className="title-text">
                <div className="title-row">
                  <h1>{APP_NAME}</h1>
                </div>
              </div>
            </PopupTitleBlock>
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
            <TabsPanel value="pane-templates">
              <TemplatesPane notify={notifications.notify} runtime={runtime} />
            </TabsPanel>
            <TabsPanel value="pane-history">
              <HistoryPane notify={notifications.notify} runtime={runtime} />
            </TabsPanel>
            <TabsPanel value="pane-debug">
              <DebugPane notify={notifications.notify} runtime={runtime} />
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

        <Sidebar
          currentPane={tabValue}
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
          onNavigate={navigateToPane}
        />
      </PopupShell>
    </TabsRoot>
  );
}
