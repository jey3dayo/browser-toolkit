import type { Result } from "@praha/byethrow";
import type { SummaryTarget as SharedSummaryTarget } from "@/content-script-messages";
import type { ExtractedEvent, SummarySource } from "@/shared_types";

export type {
  ContentScriptMessage,
  SummaryTarget,
} from "@/content-script-messages";
export type { SyncStorageData } from "@/storage/types";

export type BackgroundRequest =
  | { action: "summarizeTab"; tabId: number }
  | {
      action: "runContextAction";
      tabId: number;
      actionId: string;
      target?: SharedSummaryTarget;
      source?: "popup" | "contextMenu";
    };

export type BackgroundSuccessPayload = {
  summary: string;
  source: SummarySource;
};

export type BackgroundResponse = Result.Result<
  BackgroundSuccessPayload,
  string
>;

export type RunContextActionSuccessPayload =
  | { resultType: "text"; text: string; source: SummarySource }
  | { resultType: "event"; eventText: string; source: SummarySource };

export type RunContextActionResponse = Result.Result<
  RunContextActionSuccessPayload,
  string
>;

export type SummarizeEventSuccessPayload = {
  event: ExtractedEvent;
  eventText: string;
  calendarUrl?: string;
  calendarError?: string;
};

export type SummarizeEventResponse = Result.Result<
  SummarizeEventSuccessPayload,
  string
>;

export type ContextMenuTabParams = {
  tabId: number;
  tab?: chrome.tabs.Tab;
};
