import type { Result } from "@praha/byethrow";
import type {
  BackgroundRequest,
  BackgroundResponse,
  RunContextActionResponse,
  SummarizeEventResponse,
  SummaryTarget,
} from "@/background/types";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatFollowUpRequest = {
  action: "chatFollowUp";
  messages: ChatMessage[];
  context: string;
};

export type ChatFollowUpResponse = Result.Result<{ text: string }, string>;

export type RuntimeRequest =
  | BackgroundRequest
  | { action: "summarizeText"; target: SummaryTarget }
  | { action: "testOpenAiToken"; token?: string }
  | { action: "summarizeEvent"; target: SummaryTarget }
  | { action: "openPopupSettings" }
  | { action: "downloadDebugLogs" }
  | { action: "clearDebugLogs" }
  | { action: "getDebugLogStats" }
  | { action: "getDebugLogs" }
  | ChatFollowUpRequest;

type TestOpenAiTokenResponse = Result.Result<Record<string, never>, string>;
type DownloadDebugLogsResponse = Result.Result<Record<string, never>, string>;
type ClearDebugLogsResponse = Result.Result<Record<string, never>, string>;

type RuntimeResponse =
  | BackgroundResponse
  | RunContextActionResponse
  | SummarizeEventResponse
  | TestOpenAiTokenResponse
  | DownloadDebugLogsResponse
  | ClearDebugLogsResponse
  | ChatFollowUpResponse
  | { ok: true }
  | { ok: false; error: string }
  | {
      ok: true;
      logs: Array<{
        timestamp: string;
        level: string;
        context: string;
        message: string;
        data?: unknown;
      }>;
    }
  | {
      ok: true;
      entryCount: number;
      sizeBytes: number;
      sizeKB: string;
    };

export type RuntimeSendResponse = (response?: RuntimeResponse) => void;

export type DebugLogAction =
  | "downloadDebugLogs"
  | "clearDebugLogs"
  | "getDebugLogStats"
  | "getDebugLogs";

export type DebugLogRequest<TAction extends DebugLogAction> = {
  action: TAction;
};

export type SummarizeTextRequest = Extract<
  RuntimeRequest,
  { action: "summarizeText" }
>;
export type SummarizeEventRequest = Extract<
  RuntimeRequest,
  { action: "summarizeEvent" }
>;
