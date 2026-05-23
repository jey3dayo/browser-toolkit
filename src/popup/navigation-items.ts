import type { IconName } from "@/components/icon";
import type { TranslationKey } from "@/i18n";
import type { PaneId } from "@/popup/panes";

type NavigationItem = {
  id: PaneId;
  labelKey: TranslationKey;
  icon: IconName;
  ariaLabelKey: TranslationKey;
};

export const navigationItems: NavigationItem[] = [
  {
    id: "pane-actions",
    labelKey: "navigation.actions",
    icon: "zap",
    ariaLabelKey: "navigation.actions",
  },
  {
    id: "pane-calendar",
    labelKey: "navigation.calendar",
    icon: "calendar",
    ariaLabelKey: "navigation.calendar",
  },
  {
    id: "pane-table",
    labelKey: "navigation.table",
    icon: "table",
    ariaLabelKey: "navigation.table",
  },
  {
    id: "pane-create-link",
    labelKey: "navigation.createLink",
    icon: "link",
    ariaLabelKey: "navigation.createLink",
  },
  {
    id: "pane-search-engines",
    labelKey: "navigation.searchEngines",
    icon: "search",
    ariaLabelKey: "navigation.searchEngines",
  },
  {
    id: "pane-search-groups",
    labelKey: "navigation.searchGroups",
    icon: "layers",
    ariaLabelKey: "navigation.searchGroups",
  },
  {
    id: "pane-templates",
    labelKey: "navigation.templates",
    icon: "file-text",
    ariaLabelKey: "navigation.templates",
  },
  {
    id: "pane-history",
    labelKey: "navigation.history",
    icon: "clock",
    ariaLabelKey: "navigation.historyAria",
  },
  {
    id: "pane-debug",
    labelKey: "navigation.debug",
    icon: "bug",
    ariaLabelKey: "navigation.debug",
  },
  {
    id: "pane-settings",
    labelKey: "navigation.settings",
    icon: "settings",
    ariaLabelKey: "navigation.settings",
  },
];
