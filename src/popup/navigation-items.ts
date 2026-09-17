import type { IconName } from "@/components/icon";
import type { TranslationKey } from "@/i18n";
import type { PaneId } from "@/popup/panes";

export type NavigationGroup = "daily" | "manage";

type NavigationItem = {
  id: PaneId;
  labelKey: TranslationKey;
  icon: IconName;
  ariaLabelKey: TranslationKey;
  group: NavigationGroup;
};

export const navigationItems: NavigationItem[] = [
  {
    ariaLabelKey: "navigation.actions",
    group: "daily",
    icon: "zap",
    id: "pane-actions",
    labelKey: "navigation.actions",
  },
  {
    ariaLabelKey: "navigation.calendar",
    group: "daily",
    icon: "calendar",
    id: "pane-calendar",
    labelKey: "navigation.calendar",
  },
  {
    ariaLabelKey: "navigation.createLink",
    group: "daily",
    icon: "link",
    id: "pane-create-link",
    labelKey: "navigation.createLink",
  },
  {
    ariaLabelKey: "navigation.searchBlocklist",
    group: "daily",
    icon: "circle-slash",
    id: "pane-search-blocklist",
    labelKey: "navigation.searchBlocklist",
  },
  {
    ariaLabelKey: "navigation.table",
    group: "daily",
    icon: "table",
    id: "pane-table",
    labelKey: "navigation.table",
  },
  {
    ariaLabelKey: "navigation.searchEngines",
    group: "manage",
    icon: "search",
    id: "pane-search-engines",
    labelKey: "navigation.searchEngines",
  },
  {
    ariaLabelKey: "navigation.searchGroups",
    group: "manage",
    icon: "layers",
    id: "pane-search-groups",
    labelKey: "navigation.searchGroups",
  },
  {
    ariaLabelKey: "navigation.templates",
    group: "manage",
    icon: "file-text",
    id: "pane-templates",
    labelKey: "navigation.templates",
  },
  {
    ariaLabelKey: "navigation.historyAria",
    group: "manage",
    icon: "clock",
    id: "pane-history",
    labelKey: "navigation.history",
  },
  {
    ariaLabelKey: "navigation.settings",
    group: "manage",
    icon: "settings",
    id: "pane-settings",
    labelKey: "navigation.settings",
  },
];
