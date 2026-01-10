import { Tabs } from "@base-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME } from "@/app_meta";
import { Sidebar } from "@/popup/components/Sidebar";
import { handleCopyTitleLinkFailureOnPopupOpen } from "@/popup/copy-title-link-failure";
import { replaceHashSafely } from "@/popup/hash";
import { coercePaneId, getPaneIdFromHash, type PaneId } from "@/popup/panes";
import { ActionsPane } from "@/popup/panes/ActionsPane";
import { CalendarPane } from "@/popup/panes/CalendarPane";
import { CreateLinkPane } from "@/popup/panes/CreateLinkPane";
import { DebugPane } from "@/popup/panes/DebugPane";
import { SearchEnginesPane } from "@/popup/panes/SearchEnginesPane";
import { SettingsPane } from "@/popup/panes/SettingsPane";
import { TablePane } from "@/popup/panes/TablePane";
import { createPopupRuntime } from "@/popup/runtime";
import { createNotifications, ToastHost } from "@/ui/toast";
import type { LinkFormat } from "@/utils/link_format";

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

  const [createLinkInitialLink, setCreateLinkInitialLink] = useState<{
    title: string;
    url: string;
  } | null>(null);
  const [createLinkInitialFormat, setCreateLinkInitialFormat] =
    useState<LinkFormat | null>(null);

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

  const syncFromHash = useCallback(() => {
    const next = getPaneIdFromHash(window.location.hash);
    if (!next) {
      return;
    }
    setTabValue(next);
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [syncFromHash]);

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
      setCreateLinkInitialLink: (value) => setCreateLinkInitialLink(value),
      setCreateLinkInitialFormat: (value) => setCreateLinkInitialFormat(value),
      navigateToCreateLink: () => setTabValue("pane-create-link"),
    }).catch(() => {
      // no-op
    });
  }, [notifications.notify, runtime]);

  return (
    <Tabs.Root
      onValueChange={(value) => {
        setTabValue(coercePaneId(value));
        setMenuOpen(false);
      }}
      value={tabValue}
    >
      <div className="app-shell mbu-surface">
        <ToastHost
          placement="surface"
          portalContainer={document.body}
          toastManager={notifications.toastManager}
        />
        <main className="content">
          <header className="content-header">
            <div className="title-block">
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
            </div>
          </header>

          <div className="content-body">
            <Tabs.Panel data-pane="pane-actions" value="pane-actions">
              <ActionsPane
                focusTokenInput={focusTokenInput}
                navigateToPane={navigateToPane}
                notify={notifications.notify}
                runtime={runtime}
              />
            </Tabs.Panel>
            <Tabs.Panel data-pane="pane-calendar" value="pane-calendar">
              <CalendarPane
                focusTokenInput={focusTokenInput}
                navigateToPane={navigateToPane}
                notify={notifications.notify}
                runtime={runtime}
              />
            </Tabs.Panel>
            <Tabs.Panel data-pane="pane-table" value="pane-table">
              <TablePane notify={notifications.notify} runtime={runtime} />
            </Tabs.Panel>
            <Tabs.Panel data-pane="pane-create-link" value="pane-create-link">
              <CreateLinkPane
                initialFormat={createLinkInitialFormat ?? undefined}
                initialLink={createLinkInitialLink ?? undefined}
                notify={notifications.notify}
                runtime={runtime}
              />
            </Tabs.Panel>
            <Tabs.Panel
              data-pane="pane-search-engines"
              value="pane-search-engines"
            >
              <SearchEnginesPane
                notify={notifications.notify}
                runtime={runtime}
              />
            </Tabs.Panel>
            <Tabs.Panel data-pane="pane-debug" value="pane-debug">
              <DebugPane notify={notifications.notify} runtime={runtime} />
            </Tabs.Panel>
            <Tabs.Panel data-pane="pane-settings" value="pane-settings">
              <SettingsPane
                notify={notifications.notify}
                runtime={runtime}
                tokenInputRef={tokenInputRef}
              />
            </Tabs.Panel>
          </div>
        </main>

        <Sidebar
          currentPane={tabValue}
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
          onNavigate={navigateToPane}
        />
      </div>
    </Tabs.Root>
  );
}
