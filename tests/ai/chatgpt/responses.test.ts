import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import type { ChatRequestBody } from "@/ai/adapter";
import {
  type ChatGptResponsesError,
  fetchChatGptResponsesText,
  formatChatGptResponsesError,
  toChatGptResponsesBody,
} from "@/ai/chatgpt/responses";

const requestBody: ChatRequestBody = {
  messages: [{ content: "hello", role: "user" }],
  model: "gpt-test",
};

function sse(events: Array<{ type: string } & Record<string, unknown>>) {
  return events
    .map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)
    .join("");
}

function streamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, { status });
}

function fetchReturning(response: () => Response): typeof fetch {
  return () => Promise.resolve(response());
}

function run(fetchFn: typeof fetch, options?: { idleTimeoutMs?: number }) {
  return fetchChatGptResponsesText(
    fetchFn,
    "tok",
    requestBody,
    "empty",
    options
  );
}

function failureOf(
  result: Result.Result<string, ChatGptResponsesError>
): ChatGptResponsesError {
  if (Result.isSuccess(result)) {
    throw new Error("expected failure");
  }
  return result.error;
}

describe("toChatGptResponsesBody", () => {
  it("system を instructions に連結し、user/assistant を input に保持する", () => {
    const body = toChatGptResponsesBody({
      max_completion_tokens: 10,
      messages: [
        { content: "rule1", role: "system" },
        { content: "q1", role: "user" },
        { content: "a1", role: "assistant" },
        { content: "rule2", role: "system" },
        { content: "tool", role: "tool" },
        { content: "q2", role: "user" },
      ],
      model: "m",
      output_config: { format: { schema: {}, type: "json_schema" } },
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    expect(body).toEqual({
      input: [
        { content: "q1", role: "user" },
        { content: "a1", role: "assistant" },
        { content: "q2", role: "user" },
      ],
      instructions: "rule1\n\nrule2",
      model: "m",
      store: false,
      stream: true,
    });
  });

  it("system が無ければ instructions を付けない", () => {
    const body = toChatGptResponsesBody(requestBody);
    expect("instructions" in body).toBe(false);
    expect(body.store).toBe(false);
    expect(body.stream).toBe(true);
  });
});

describe("fetchChatGptResponsesText", () => {
  it("リクエスト形式を満たし、チャンク境界で分割された delta を連結する", async () => {
    let captured: { url: string; init: RequestInit | undefined } | null = null;
    const full = sse([
      { delta: "こんに", type: "response.output_text.delta" },
      { delta: "ちは ", type: "response.output_text.delta" },
      { type: "response.completed" },
    ]);
    const mid = Math.floor(full.length / 2);
    const fetchFn: typeof fetch = (input, init) => {
      captured = { init, url: String(input) };
      return Promise.resolve(
        streamResponse([full.slice(0, 7), full.slice(7, mid), full.slice(mid)])
      );
    };

    const result = await run(fetchFn);
    expect(result).toEqual(Result.succeed("こんにちは"));
    expect(captured).not.toBeNull();
    expect(captured?.url).toBe("https://api.openai.com/v1/responses");
    expect(captured?.init?.method).toBe("POST");
    expect(captured?.init?.headers).toEqual({
      Accept: "text/event-stream",
      Authorization: "Bearer tok",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(captured?.init?.body))).toMatchObject({
      model: "gpt-test",
      store: false,
      stream: true,
    });
  });

  it("マルチバイト文字がチャンク境界で割れても復元する", async () => {
    const bytes = new TextEncoder().encode(
      sse([
        { delta: "日本語", type: "response.output_text.delta" },
        { type: "response.completed" },
      ])
    );
    const cut = bytes.indexOf(0xe6) + 1;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, cut));
        controller.enqueue(bytes.slice(cut));
        controller.close();
      },
    });
    const result = await run(fetchReturning(() => new Response(stream)));
    expect(result).toEqual(Result.succeed("日本語"));
  });

  it("[DONE] と CRLF 区切りを扱える", async () => {
    const text =
      'data: {"type":"response.output_text.delta","delta":"ok"}\r\n\r\n' +
      'data: {"type":"response.completed"}\r\n\r\ndata: [DONE]\r\n\r\n';
    const result = await run(fetchReturning(() => streamResponse([text])));
    expect(result).toEqual(Result.succeed("ok"));
  });

  it("複数 data 行のイベントで CR と LF が別チャンクに分かれても 1 イベントとして扱う", async () => {
    const result = await run(
      fetchReturning(() =>
        streamResponse([
          'data: {"type":"response.output_text.delta",\r',
          '\ndata: "delta":"AB"}\r\n\r\n',
          'data: {"type":"response.completed"}\r\n\r\n',
        ])
      )
    );
    expect(Result.isSuccess(result) && result.value).toBe("AB");
  });

  it("response.completed を受けずに終わったら成功扱いしない", async () => {
    const result = await run(
      fetchReturning(() =>
        streamResponse([
          sse([{ delta: "partial", type: "response.output_text.delta" }]),
        ])
      )
    );
    expect(failureOf(result).message).toBe("応答が途中で終了しました");
  });

  it("response.failed の code と message を保持する", async () => {
    const result = await run(
      fetchReturning(() =>
        streamResponse([
          sse([
            {
              response: {
                error: {
                  code: "subscription_sharing_usage_limit_exceeded",
                  message: "limit",
                },
              },
              type: "response.failed",
            },
          ]),
        ])
      )
    );
    expect(failureOf(result)).toEqual({
      code: "subscription_sharing_usage_limit_exceeded",
      message: "limit",
      status: null,
    });
  });

  it("response.incomplete で error が無ければ type 名を message にする", async () => {
    const result = await run(
      fetchReturning(() =>
        streamResponse([sse([{ response: {}, type: "response.incomplete" }])])
      )
    );
    expect(failureOf(result)).toEqual({
      code: null,
      message: "response.incomplete",
      status: null,
    });
  });

  it("error イベントの code と message で失敗する", async () => {
    const result = await run(
      fetchReturning(() =>
        streamResponse([sse([{ code: "bad", message: "oops", type: "error" }])])
      )
    );
    expect(failureOf(result)).toMatchObject({ code: "bad", message: "oops" });
  });

  it("空テキストは emptyContentMessage で失敗する", async () => {
    const result = await run(
      fetchReturning(() =>
        streamResponse([
          sse([
            { delta: "  \n", type: "response.output_text.delta" },
            { type: "response.completed" },
          ]),
        ])
      )
    );
    expect(failureOf(result).message).toBe("empty");
  });

  it("非 2xx の {error:{code,message}} を status 付きで返す", async () => {
    const result = await run(
      fetchReturning(
        () =>
          new Response(
            JSON.stringify({
              error: {
                code: "subscription_sharing_user_not_eligible",
                message: "no",
              },
            }),
            { status: 403 }
          )
      )
    );
    expect(failureOf(result)).toEqual({
      code: "subscription_sharing_user_not_eligible",
      message: "no",
      status: 403,
    });
  });

  it("非 2xx の {detail} を message にする", async () => {
    const result = await run(
      fetchReturning(
        () =>
          new Response(JSON.stringify({ detail: "denied" }), { status: 401 })
      )
    );
    expect(failureOf(result)).toEqual({
      code: null,
      message: "denied",
      status: 401,
    });
  });

  it("非 2xx で JSON が読めなければ定型メッセージ", async () => {
    const result = await run(
      fetchReturning(() => new Response("<html>", { status: 500 }))
    );
    expect(failureOf(result)).toEqual({
      code: null,
      message: "OpenAI APIエラー: 500",
      status: 500,
    });
  });

  it("ヘッダー待ちが idle timeout を超えたら timeout で失敗する", async () => {
    const fetchFn: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError"))
        );
      });
    const result = await run(fetchFn, { idleTimeoutMs: 20 });
    expect(failureOf(result).code).toBe("timeout");
  });

  it("チャンク間の無通信が idle timeout を超えたら timeout で失敗する", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            sse([{ delta: "a", type: "response.output_text.delta" }])
          )
        );
      },
    });
    const result = await run(
      fetchReturning(() => new Response(stream)),
      {
        idleTimeoutMs: 30,
      }
    );
    expect(failureOf(result).code).toBe("timeout");
  });

  it("チャンクが届き続ける間は全体が idle timeout を超えても失敗しない", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const parts = [
          sse([{ delta: "a", type: "response.output_text.delta" }]),
          sse([{ delta: "b", type: "response.output_text.delta" }]),
          sse([{ type: "response.completed" }]),
        ];
        parts.forEach((part, index) => {
          setTimeout(
            () => {
              controller.enqueue(encoder.encode(part));
              if (index === parts.length - 1) {
                controller.close();
              }
            },
            40 * (index + 1)
          );
        });
      },
    });
    const result = await run(
      fetchReturning(() => new Response(stream)),
      {
        idleTimeoutMs: 100,
      }
    );
    expect(result).toEqual(Result.succeed("ab"));
  });

  it("fetch の例外は message 付きの失敗にする", async () => {
    const result = await run(() => Promise.reject(new Error("network down")));
    expect(failureOf(result)).toEqual({
      code: null,
      message: "network down",
      status: null,
    });
  });
});

describe("formatChatGptResponsesError", () => {
  const err = (
    code: string | null,
    status: number | null,
    message = "raw"
  ): ChatGptResponsesError => ({ code, message, status });

  it("利用上限は利用状況ページを案内する", () => {
    const text = formatChatGptResponsesError(
      err("subscription_sharing_usage_limit_exceeded", 429)
    );
    expect(text).toContain("上限");
    expect(text).toContain("https://chatgpt.com/settings/usage");
  });

  it("対象外アカウントを案内する", () => {
    expect(
      formatChatGptResponsesError(
        err("subscription_sharing_user_not_eligible", 403)
      )
    ).toContain("利用できません");
  });

  it.each([
    err("subscription_sharing_usage_unavailable", null),
    err("subscription_sharing_user_unavailable", null),
    err(null, 503),
  ])("一時的な利用不可は再試行を案内する", (error) => {
    expect(formatChatGptResponsesError(error)).toContain("時間をおいて");
  });

  it("未対応の機能は message を添える", () => {
    expect(
      formatChatGptResponsesError(
        err("subscription_sharing_unsupported_capability", 400, "model x")
      )
    ).toContain("model x");
  });

  it.each([err(null, 401), err("subscription_sharing_invalid_user", 403)])(
    "再サインインを案内する",
    (error) => {
      expect(formatChatGptResponsesError(error)).toContain("再サインイン");
    }
  );

  it("timeout とその他", () => {
    expect(formatChatGptResponsesError(err("timeout", null))).toContain(
      "タイムアウト"
    );
    expect(formatChatGptResponsesError(err("other", 400, "raw msg"))).toBe(
      "raw msg"
    );
  });
});
