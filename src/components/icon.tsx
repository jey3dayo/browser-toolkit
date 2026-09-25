import {
  ArrowUp,
  Bug,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Link,
  type LucideProps,
  Menu,
  Monitor,
  Moon,
  Pencil,
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
  | "arrow-up"
  | "bug"
  | "calendar"
  | "check"
  | "chevron-down"
  | "chevron-right"
  | "circle-slash"
  | "clock"
  | "close"
  | "copy"
  | "eye"
  | "eye-off"
  | "file-text"
  | "layers"
  | "link"
  | "menu"
  | "monitor"
  | "moon"
  | "pin"
  | "pencil"
  | "qr-code"
  | "search"
  | "settings"
  | "sun"
  | "table"
  | "zap";

const icons: Record<IconName, React.ComponentType<LucideProps>> = {
  "arrow-up": ArrowUp,
  bug: Bug,
  calendar: Calendar,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "circle-slash": CircleSlash,
  clock: Clock,
  close: X,
  copy: Copy,
  eye: Eye,
  "eye-off": EyeOff,
  "file-text": FileText,
  layers: Layers,
  link: Link,
  menu: Menu,
  monitor: Monitor,
  moon: Moon,
  pencil: Pencil,
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
