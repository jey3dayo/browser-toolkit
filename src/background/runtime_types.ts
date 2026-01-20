import type { Result } from "@praha/byethrow";
import type {
  BackgroundRequest,
  BackgroundResponse,
  RunContextActionResponse,
  SummarizeEventResponse,
  SummaryTarget,
} from "@/background/types";

export type RuntimeRequest =
  | BackgroundRequest
  | { action: "summarizeText"; target: SummaryTarget }
  | { action: "testOpenAiToken"; token?: string }
  | { action: "summarizeEvent"; target: SummaryTarget }
  | { action: "openPopupSettings" }
  | { action: "downloadDebugLogs" }
  | { action: "clearDebugLogs" }
  | { action: "getDebugLogStats" }
  | { action: "getDebugLogs" };

export type TestOpenAiTokenResponse = Result.Result<
  Record<string, never>,
  string
>;
export type DownloadDebugLogsResponse = Result.Result<
  Record<string, never>,
  string
>;
export type ClearDebugLogsResponse = Result.Result<
  Record<string, never>,
  string
>;

type RuntimeResponse =
  | BackgroundResponse
  | RunContextActionResponse
  | SummarizeEventResponse
  | TestOpenAiTokenResponse
  | DownloadDebugLogsResponse
  | ClearDebugLogsResponse
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
