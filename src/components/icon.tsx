import {
  Bug,
  Calendar,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Link,
  type LucideProps,
  Menu,
  MessageSquare,
  Monitor,
  Moon,
  Pin,
  QrCode,
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
  | "clock"
  | "close"
  | "copy"
  | "eye"
  | "eye-off"
  | "file-text"
  | "layers"
  | "link"
  | "menu"
  | "message-square"
  | "monitor"
  | "moon"
  | "pin"
  | "qr-code"
  | "search"
  | "settings"
  | "sun"
  | "table"
  | "zap";

const icons: Record<IconName, React.ComponentType<LucideProps>> = {
  bug: Bug,
  calendar: Calendar,
  clock: Clock,
  close: X,
  copy: Copy,
  eye: Eye,
  "eye-off": EyeOff,
  "file-text": FileText,
  layers: Layers,
  link: Link,
  menu: Menu,
  "message-square": MessageSquare,
  monitor: Monitor,
  moon: Moon,
  pin: Pin,
  "qr-code": QrCode,
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
