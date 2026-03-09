// Content Script 共有型定義
import type { ToastMount } from "@/content/notification";
import type { OverlayMount } from "@/content/overlay-helpers";

export type GlobalContentState = {
  initialized: boolean;
  overlayMount: OverlayMount | null;
  toastMount: ToastMount | null;
};
