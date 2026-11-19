import type { Result } from "@praha/byethrow";
import type {
  BackgroundRequest,
  RunContextActionResponse,
  SummarizeEventResponse,
  SummaryTarget,
} from "@/background/types";
import type { DownloadImagePayload } from "@/image-zoom/download-url";
import type { SearchBlocklistRuleMutation } from "@/search-blocklist/rules";
import type { SearchBlocklistRule } from "@/search-blocklist/types";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatFollowUpRequest = {
  action: "chatFollowUp";
  messages: ChatMessage[];
  context: string;
};

type ChatFollowUpResponse = Result.Result<{ text: string }, string>;

export type OpenPopupPaneRequest = {
  action: "openPopupPane";
  paneId: string;
};

export type SearchBlocklistMutateRequest = {
  action: "searchBlocklistMutate";
} & SearchBlocklistRuleMutation;

export type SearchBlocklistMutateResponse = Result.Result<
  { rules: SearchBlocklistRule[]; revision: number; skippedCount: number },
  string
>;

export type DownloadImageRequest = DownloadImagePayload;

type DownloadImageResponse = Result.Result<Record<string, never>, string>;

type ChatGptAuthStateResponse = Result.Result<
  {
    status: "signedOut" | "pending" | "signedIn" | "failed";
    email: string | null;
    errorMessage: string | null;
  },
  string
>;
type ChatGptSignInResponse = Result.Result<Record<string, never>, string>;
type ChatGptSignOutResponse = Result.Result<
  { revokeConfirmed: boolean },
  string
>;

export type RuntimeRequest =
  | BackgroundRequest
  | { action: "testOpenAiToken"; token?: string }
  | { action: "summarizeEvent"; target: SummaryTarget }
  | OpenPopupPaneRequest
  | SearchBlocklistMutateRequest
  | DownloadImageRequest
  | { action: "downloadDebugLogs" }
  | { action: "clearDebugLogs" }
  | { action: "getDebugLogStats" }
  | { action: "getDebugLogs" }
  | ChatFollowUpRequest
  | { action: "chatgptAuthState" }
  | { action: "chatgptSignIn" }
  | { action: "chatgptSignOut" };

type TestOpenAiTokenResponse = Result.Result<Record<string, never>, string>;
type DownloadDebugLogsResponse = Result.Result<Record<string, never>, string>;
type ClearDebugLogsResponse = Result.Result<Record<string, never>, string>;

type RuntimeResponse =
  | RunContextActionResponse
  | SummarizeEventResponse
  | TestOpenAiTokenResponse
  | DownloadDebugLogsResponse
  | ClearDebugLogsResponse
  | ChatFollowUpResponse
  | ChatGptAuthStateResponse
  | ChatGptSignInResponse
  | ChatGptSignOutResponse
  | SearchBlocklistMutateResponse
  | DownloadImageResponse
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

type DebugLogAction =
  | "downloadDebugLogs"
  | "clearDebugLogs"
  | "getDebugLogStats"
  | "getDebugLogs";

export type DebugLogRequest<TAction extends DebugLogAction> = {
  action: TAction;
};

export type SummarizeEventRequest = Extract<
  RuntimeRequest,
  { action: "summarizeEvent" }
>;
