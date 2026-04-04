import type { ExtractedEvent, SummarySource } from "@/shared_types";

export type SummaryTarget = {
  text: string;
  source: SummarySource;
  title?: string;
  url?: string;
};

export type ShowNotificationMessage = {
  action: "showNotification";
  message: string;
};

export type GetSummaryTargetTextMessage = {
  action: "getSummaryTargetText";
  ignoreSelection?: boolean;
};

export type CopyToClipboardMessage = {
  action: "copyToClipboard";
  text: string;
  successMessage?: string;
};

export type PasteTemplateMessage = {
  action: "pasteTemplate";
  content: string;
};

export type SummaryOverlayRequest = {
  action: "showSummaryOverlay";
  status: "loading" | "ready" | "error";
  source: SummarySource;
  summary?: string;
  error?: string;
};

export type ActionOverlayRequest = {
  action: "showActionOverlay";
  status: "loading" | "ready" | "error";
  mode: "text" | "event";
  source: SummarySource;
  title: string;
  primary?: string;
  secondary?: string;
  calendarUrl?: string;
  ics?: string;
  event?: ExtractedEvent;
};

export type ShowQrCodeOverlayMessage = {
  action: "showQrCodeOverlay";
  url: string;
};

export type ContentScriptMessage =
  | ShowNotificationMessage
  | GetSummaryTargetTextMessage
  | CopyToClipboardMessage
  | PasteTemplateMessage
  | SummaryOverlayRequest
  | ActionOverlayRequest
  | ShowQrCodeOverlayMessage;

export type ContentRequest =
  | { action: "enableTableSort" }
  | ContentScriptMessage;
