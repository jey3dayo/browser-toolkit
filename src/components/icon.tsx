import {
  Calendar,
  Copy,
  Eye,
  EyeOff,
  Link,
  type LucideProps,
  Menu,
  Monitor,
  Moon,
  Pin,
  Search,
  Settings,
  Sun,
  Table,
  X,
  Zap,
} from "lucide-react";

export type IconName =
  | "calendar"
  | "close"
  | "copy"
  | "eye"
  | "eye-off"
  | "link"
  | "menu"
  | "monitor"
  | "moon"
  | "pin"
  | "search"
  | "settings"
  | "sun"
  | "table"
  | "zap";

const icons: Record<IconName, React.ComponentType<LucideProps>> = {
  calendar: Calendar,
  close: X,
  copy: Copy,
  eye: Eye,
  "eye-off": EyeOff,
  link: Link,
  menu: Menu,
  monitor: Monitor,
  moon: Moon,
  pin: Pin,
  search: Search,
  settings: Settings,
  sun: Sun,
  table: Table,
  zap: Zap,
};

export type IconProps = LucideProps & {
  name: IconName;
};

export function Icon({ name, ...props }: IconProps): React.JSX.Element {
  const Component = icons[name];
  return <Component {...props} />;
}
