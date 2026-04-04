import type { Result } from "@praha/byethrow";
import type { SummaryTarget as SharedSummaryTarget } from "@/content-script-messages";
import type { ContextAction } from "@/context_actions";
import type { SearchEngineGroup } from "@/search_engine_groups";
import type { SearchEngine } from "@/search_engine_types";
import type {
  CalendarRegistrationTarget,
  ExtractedEvent,
  SummarySource,
} from "@/shared_types";
import type { TextTemplate } from "@/text_templates";
import type { LinkFormat } from "@/utils/link_format";

export type {
  ContentScriptMessage,
  SummaryTarget,
} from "@/content-script-messages";

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

export type SyncStorageData = {
  contextActions?: ContextAction[];
  linkFormat?: LinkFormat;
  calendarTargets?: CalendarRegistrationTarget[];
  searchEngines?: SearchEngine[];
  searchEngineGroups?: SearchEngineGroup[];
  textTemplates?: TextTemplate[];
};
