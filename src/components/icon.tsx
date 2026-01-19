import {
  Bug,
  Calendar,
  Copy,
  Eye,
  EyeOff,
  FileText,
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
  | "bug"
  | "calendar"
  | "close"
  | "copy"
  | "eye"
  | "eye-off"
  | "file-text"
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
  bug: Bug,
  calendar: Calendar,
  close: X,
  copy: Copy,
  eye: Eye,
  "eye-off": EyeOff,
  "file-text": FileText,
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
