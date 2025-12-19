import type { PopupRuntime } from "@/popup/runtime";
import type { Notifier } from "@/ui/toast";

export type PopupPaneBaseProps = {
  runtime: PopupRuntime;
  notify: Notifier;
};
