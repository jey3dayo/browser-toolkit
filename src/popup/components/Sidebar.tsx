import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { APP_NAME } from "@/app_meta";
import { Icon } from "@/components/icon";
import { TabsList, TabsTab } from "@/components/shared/Tabs";
import { i18n } from "@/i18n";
import { navigationItems } from "@/popup/navigation-items";

export function Sidebar(): React.JSX.Element {
  const { t } = useTranslation(undefined, { i18n });

  return (
    <aside aria-label={t("sidebar.menu")} className="sidebar">
      <div className="sidebar-brand">
        <img alt={APP_NAME} height={28} src="images/icon48.png" width={28} />
      </div>
      <TabsList>
        {navigationItems.map((item, index) => {
          const previous = navigationItems[index - 1];
          const startsNewGroup =
            previous !== undefined && previous.group !== item.group;

          return (
            <Fragment key={item.id}>
              {startsNewGroup ? (
                <div aria-hidden="true" className="nav-group-separator" />
              ) : null}
              <TabsTab
                aria-label={t(item.ariaLabelKey)}
                data-value={item.id}
                value={item.id}
                variant="nav"
              >
                <span aria-hidden="true" className="nav-icon">
                  <Icon aria-hidden="true" name={item.icon} />
                </span>
                <span className="nav-label">{t(item.labelKey)}</span>
              </TabsTab>
            </Fragment>
          );
        })}
      </TabsList>
    </aside>
  );
}
