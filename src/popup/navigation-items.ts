import type { IconName } from "@/components/icon";
import type { PaneId } from "@/popup/panes";

export type NavigationItem = {
  id: PaneId;
  label: string;
  icon: IconName;
  ariaLabel: string;
};

export const navigationItems: NavigationItem[] = [
  {
    id: "pane-actions",
    label: "アクション",
    icon: "zap",
    ariaLabel: "アクション",
  },
  {
    id: "pane-calendar",
    label: "カレンダー登録",
    icon: "calendar",
    ariaLabel: "カレンダー登録",
  },
  {
    id: "pane-table",
    label: "テーブルソート",
    icon: "table",
    ariaLabel: "テーブルソート",
  },
  {
    id: "pane-create-link",
    label: "リンク作成",
    icon: "link",
    ariaLabel: "リンク作成",
  },
  {
    id: "pane-search-engines",
    label: "検索エンジン",
    icon: "search",
    ariaLabel: "検索エンジン",
  },
  {
    id: "pane-debug",
    label: "デバッグ",
    icon: "bug",
    ariaLabel: "デバッグ",
  },
  {
    id: "pane-settings",
    label: "設定",
    icon: "settings",
    ariaLabel: "設定",
  },
];
