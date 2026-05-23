import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

const tabVariants = cva("", {
  variants: {
    variant: {
      default: null,
      nav: "nav-item",
    },
  },
});

export type TabsRootProps = React.ComponentProps<typeof BaseTabs.Root>;

export function TabsRoot(props: TabsRootProps): React.JSX.Element {
  return <BaseTabs.Root {...props} />;
}

export type TabsListProps = React.ComponentProps<typeof BaseTabs.List>;

export function TabsList(props: TabsListProps): React.JSX.Element {
  return <BaseTabs.List {...props} />;
}

export type TabsTabProps = Omit<
  React.ComponentProps<typeof BaseTabs.Tab>,
  "className"
> &
  VariantProps<typeof tabVariants> & {
    className?: string;
  };

export function TabsTab({
  className,
  variant,
  ...props
}: TabsTabProps): React.JSX.Element {
  return (
    <BaseTabs.Tab className={tabVariants({ className, variant })} {...props} />
  );
}

export type TabsPanelProps = React.ComponentProps<typeof BaseTabs.Panel> & {
  dataPane?: string;
};

export function TabsPanel({
  dataPane,
  value,
  ...props
}: TabsPanelProps): React.JSX.Element {
  return (
    <BaseTabs.Panel
      data-pane={dataPane ?? (typeof value === "string" ? value : undefined)}
      value={value}
      {...props}
    />
  );
}
