import { Result } from "@praha/byethrow";
import type { ChatRequestBody } from "@/ai/adapter";
import { CHATGPT_RESOURCE, CHATGPT_USAGE_URL } from "@/ai/chatgpt/oauth";
import { isAllowedApiOrigin } from "@/constants/api-endpoints";
import { API_FETCH_TIMEOUT_MS } from "@/constants/timeouts";
import { isRecord } from "@/utils/guards";

export type ChatGptResponsesError = {
  status: number | null;
  code: string | null;
  message: string;
};

type ResponsesInput = { role: "user" | "assistant"; content: string };

export function toChatGptResponsesBody(body: ChatRequestBody): {
  model: string;
  instructions?: string;
  input: ResponsesInput[];
  store: false;
  stream: true;
} {
  const systemTexts: string[] = [];
  const input: ResponsesInput[] = [];
  for (const message of body.messages) {
    if (message.role === "system") {
      systemTexts.push(message.content);
    } else if (message.role === "user" || message.role === "assistant") {
      input.push({ content: message.content, role: message.role });
    }
  }

  return {
    model: body.model,
    ...(systemTexts.length > 0
      ? { instructions: systemTexts.join("\n\n") }
      : {}),
    input,
    store: false,
    stream: true,
  };
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function parseErrorBody(status: number, text: string): ChatGptResponsesError {
  const fallback = `OpenAI APIエラー: ${status}`;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { code: null, message: fallback, status };
  }
  if (!isRecord(json)) {
    return { code: null, message: fallback, status };
  }

  const nested = isRecord(json.error) ? json.error : null;
  const code = nested ? readString(nested, "code") : null;
  const message =
    (nested ? readString(nested, "message") : null) ??
    readString(json, "detail") ??
    (typeof json.error === "string" ? readString(json, "error") : null) ??
    fallback;
  return { code, message, status };
}

type StreamOutcome =
  | { kind: "continue" }
  | { kind: "completed" }
  | { kind: "failed"; error: ChatGptResponsesError };

function failure(
  code: string | null,
  message: string
): { kind: "failed"; error: ChatGptResponsesError } {
  return { error: { code, message, status: null }, kind: "failed" };
}

function parseEventJson(data: string): Record<string, unknown> | null {
  try {
    const json: unknown = JSON.parse(data);
    return isRecord(json) ? json : null;
  } catch {
    return null;
  }
}

function nestedRecord(
  record: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  const value = record?.[key];
  return isRecord(value) ? value : null;
}

function failureFromRecord(
  error: Record<string, unknown> | null,
  type: string
): StreamOutcome {
  return failure(
    error ? readString(error, "code") : null,
    (error ? readString(error, "message") : null) ?? type
  );
}

function handleStreamEvent(data: string, chunks: string[]): StreamOutcome {
  const json = parseEventJson(data);
  const type = json?.type;
  if (!json || typeof type !== "string") {
    return { kind: "continue" };
  }

  if (type === "response.output_text.delta") {
    if (typeof json.delta === "string") {
      chunks.push(json.delta);
    }
    return { kind: "continue" };
  }
  if (type === "response.completed") {
    return { kind: "completed" };
  }
  if (type === "response.failed" || type === "response.incomplete") {
    return failureFromRecord(
      nestedRecord(nestedRecord(json, "response"), "error"),
      type
    );
  }
  if (type === "error") {
    return failureFromRecord(nestedRecord(json, "error") ?? json, type);
  }
  return { kind: "continue" };
}

const LINE_BREAK = /\r\n|\n|\r/;

class SseParser {
  private buffer = "";
  private dataLines: string[] = [];

  push(text: string): string[] {
    this.buffer += text;
    const lines = this.buffer.split(LINE_BREAK);
    this.buffer = lines.pop() ?? "";
    return this.consume(lines);
  }

  flush(): string[] {
    const lines = this.buffer === "" ? [] : [this.buffer];
    this.buffer = "";
    const events = this.consume(lines);
    if (this.dataLines.length > 0) {
      events.push(this.dataLines.join("\n"));
      this.dataLines = [];
    }
    return events;
  }

  private consume(lines: string[]): string[] {
    const events: string[] = [];
    for (const line of lines) {
      if (line === "") {
        if (this.dataLines.length > 0) {
          events.push(this.dataLines.join("\n"));
          this.dataLines = [];
        }
      } else if (line.startsWith("data:")) {
        const value = line.slice(5);
        this.dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
      }
    }
    return events.filter((data) => data !== "[DONE]");
  }
}

type IdleGuard = {
  signal: AbortSignal;
  arm: () => void;
  clear: () => void;
  isTimedOut: () => boolean;
  attachReader: (reader: ReadableStreamDefaultReader<Uint8Array>) => void;
};

function createIdleGuard(idleTimeoutMs: number): IdleGuard {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  return {
    arm: () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reader?.cancel().catch(() => undefined);
      }, idleTimeoutMs);
    },
    attachReader: (next) => {
      reader = next;
    },
    clear: () => clearTimeout(timer),
    isTimedOut: () => timedOut,
    signal: controller.signal,
  };
}

function plainFailure(
  message: string,
  code: string | null = null
): Result.Result<never, ChatGptResponsesError> {
  return Result.fail({ code, message, status: null });
}

type StreamState = {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  decoder: TextDecoder;
  parser: SseParser;
  chunks: string[];
  guard: IdleGuard;
};

function applyEvents(events: string[], chunks: string[]): StreamOutcome {
  for (const data of events) {
    const outcome = handleStreamEvent(data, chunks);
    if (outcome.kind !== "continue") {
      return outcome;
    }
  }
  return { kind: "continue" };
}

async function readUntilCompleted(
  state: StreamState
): Promise<Result.Result<void, ChatGptResponsesError>> {
  const { done, value } = await state.reader.read();
  if (state.guard.isTimedOut()) {
    return timeoutFailure();
  }
  state.guard.arm();
  const events = done
    ? [...state.parser.push(state.decoder.decode()), ...state.parser.flush()]
    : state.parser.push(state.decoder.decode(value, { stream: true }));
  const outcome = applyEvents(events, state.chunks);
  if (outcome.kind === "failed") {
    return Result.fail(outcome.error);
  }
  if (outcome.kind === "completed") {
    return Result.succeed();
  }
  if (done) {
    return plainFailure("応答が途中で終了しました");
  }
  return readUntilCompleted(state);
}

function timeoutFailure(): Result.Result<never, ChatGptResponsesError> {
  return plainFailure("ChatGPT への接続がタイムアウトしました", "timeout");
}

export function fetchChatGptResponsesText(
  fetchFn: typeof fetch,
  accessToken: string,
  body: ChatRequestBody,
  emptyContentMessage: string,
  options?: { idleTimeoutMs?: number }
): Result.ResultAsync<string, ChatGptResponsesError> {
  const url = `${CHATGPT_RESOURCE}/responses`;
  if (!isAllowedApiOrigin(url)) {
    return Promise.resolve(
      plainFailure(
        `セキュリティエラー: 許可されていないAPIエンドポイント (${new URL(url).origin})`
      )
    );
  }

  const guard = createIdleGuard(options?.idleTimeoutMs ?? API_FETCH_TIMEOUT_MS);
  guard.arm();
  return requestResponsesText(
    fetchFn,
    url,
    accessToken,
    body,
    emptyContentMessage,
    guard
  )
    .catch((error: unknown) => {
      if (guard.isTimedOut()) {
        return timeoutFailure();
      }
      return plainFailure(
        error instanceof Error && error.message
          ? error.message
          : "APIへのリクエストに失敗しました"
      );
    })
    .finally(guard.clear);
}

async function requestResponsesText(
  fetchFn: typeof fetch,
  url: string,
  accessToken: string,
  body: ChatRequestBody,
  emptyContentMessage: string,
  guard: IdleGuard
): Promise<Result.Result<string, ChatGptResponsesError>> {
  const response = await fetchFn(url, {
    body: JSON.stringify(toChatGptResponsesBody(body)),
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: guard.signal,
  });

  if (!response.ok) {
    return Result.fail(parseErrorBody(response.status, await response.text()));
  }
  if (!response.body) {
    return plainFailure(emptyContentMessage);
  }

  const reader = response.body.getReader();
  guard.attachReader(reader);
  const chunks: string[] = [];
  const finished = await readUntilCompleted({
    chunks,
    decoder: new TextDecoder(),
    guard,
    parser: new SseParser(),
    reader,
  });
  await reader.cancel().catch(() => undefined);
  if (Result.isFailure(finished)) {
    return Result.fail(finished.error);
  }

  const text = chunks.join("").trim();
  return text === "" ? plainFailure(emptyContentMessage) : Result.succeed(text);
}

export function formatChatGptResponsesError(
  error: ChatGptResponsesError
): string {
  switch (error.code) {
    case "subscription_sharing_usage_limit_exceeded":
      return `ChatGPT プランの利用上限に達しました。${CHATGPT_USAGE_URL} で利用状況を確認してください`;
    case "subscription_sharing_user_not_eligible":
      return "このアカウントまたはワークスペースでは ChatGPT プランを利用できません";
    case "subscription_sharing_usage_unavailable":
    case "subscription_sharing_user_unavailable":
      return "ChatGPT プランを一時的に利用できません。時間をおいて再試行してください";
    case "subscription_sharing_unsupported_capability":
      return `未対応のモデルまたは機能です: ${error.message}`;
    case "subscription_sharing_invalid_user":
      return "ChatGPT の再サインインが必要です";
    case "timeout":
      return "ChatGPT への接続がタイムアウトしました。時間をおいて再試行してください";
    default:
      break;
  }
  if (error.status === 401) {
    return "ChatGPT の再サインインが必要です";
  }
  if (error.status === 503) {
    return "ChatGPT プランを一時的に利用できません。時間をおいて再試行してください";
  }
  return error.message;
}
