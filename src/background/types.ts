import type { Result } from "@praha/byethrow";
import type { ContextAction } from "@/context_actions";
import type { SearchEngineGroup } from "@/search_engine_groups";
import type { SearchEngine } from "@/search_engines";
import type {
  CalendarRegistrationTarget,
  ExtractedEvent,
  SummarySource,
} from "@/shared_types";
import type { TextTemplate } from "@/text_templates";
import type { LinkFormat } from "@/utils/link_format";

export type SummaryTarget = {
  text: string;
  source: SummarySource;
  title?: string;
  url?: string;
};

export type ContentScriptMessage =
  | { action: "showNotification"; message: string }
  | { action: "getSummaryTargetText"; ignoreSelection?: boolean }
  | { action: "copyToClipboard"; text: string; successMessage?: string }
  | { action: "pasteTemplate"; content: string }
  | {
      action: "showSummaryOverlay";
      status: "loading" | "ready" | "error";
      source: SummarySource;
      summary?: string;
      error?: string;
    }
  | {
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

export type BackgroundRequest =
  | { action: "summarizeTab"; tabId: number }
  | {
      action: "runContextAction";
      tabId: number;
      actionId: string;
      target?: SummaryTarget;
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

export type SyncStorageData = {
  contextActions?: ContextAction[];
  linkFormat?: LinkFormat;
  calendarTargets?: CalendarRegistrationTarget[];
  searchEngines?: SearchEngine[];
  searchEngineGroups?: SearchEngineGroup[];
  textTemplates?: TextTemplate[];
};
