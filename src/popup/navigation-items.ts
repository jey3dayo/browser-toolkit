import type { IconName } from "@/components/icon";
import type { TranslationKey } from "@/i18n";
import { canSurfaceRender, type PaneId, type PaneSurface } from "@/popup/panes";

export type NavigationItem = {
  id: PaneId;
  labelKey: TranslationKey;
  icon: IconName;
  ariaLabelKey: TranslationKey;
};

export const navigationItems: NavigationItem[] = [
  {
    ariaLabelKey: "navigation.actions",
    icon: "zap",
    id: "pane-actions",
    labelKey: "navigation.actions",
  },
  {
    ariaLabelKey: "navigation.calendar",
    icon: "calendar",
    id: "pane-calendar",
    labelKey: "navigation.calendar",
  },
  {
    ariaLabelKey: "navigation.createLink",
    icon: "link",
    id: "pane-create-link",
    labelKey: "navigation.createLink",
  },
  {
    ariaLabelKey: "navigation.searchBlocklist",
    icon: "circle-slash",
    id: "pane-search-blocklist",
    labelKey: "navigation.searchBlocklist",
  },
  {
    ariaLabelKey: "navigation.table",
    icon: "table",
    id: "pane-table",
    labelKey: "navigation.table",
  },
  {
    ariaLabelKey: "navigation.searchEngines",
    icon: "search",
    id: "pane-search-engines",
    labelKey: "navigation.searchEngines",
  },
  {
    ariaLabelKey: "navigation.searchGroups",
    icon: "layers",
    id: "pane-search-groups",
    labelKey: "navigation.searchGroups",
  },
  {
    ariaLabelKey: "navigation.templates",
    icon: "file-text",
    id: "pane-templates",
    labelKey: "navigation.templates",
  },
  {
    ariaLabelKey: "navigation.historyAria",
    icon: "clock",
    id: "pane-history",
    labelKey: "navigation.history",
  },
  {
    ariaLabelKey: "navigation.settings",
    icon: "settings",
    id: "pane-settings",
    labelKey: "navigation.settings",
  },
];

export function getNavigationItems(surface: PaneSurface): NavigationItem[] {
  return navigationItems.filter((item) => canSurfaceRender(surface, item.id));
}
