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
    ariaLabelKey: "navigation.table",
    icon: "table",
    id: "pane-table",
    labelKey: "navigation.table",
  },
  {
    ariaLabelKey: "navigation.createLink",
    icon: "link",
    id: "pane-create-link",
    labelKey: "navigation.createLink",
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
    ariaLabelKey: "navigation.debug",
    icon: "bug",
    id: "pane-debug",
    labelKey: "navigation.debug",
  },
  {
    ariaLabelKey: "navigation.settings",
    icon: "settings",
    id: "pane-settings",
    labelKey: "navigation.settings",
  },
];
