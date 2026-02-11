import { Result } from "@praha/byethrow";
import type { ChatRequestBody } from "@/ai/adapter";
import { getAdapter } from "@/ai/get-adapter";
import { loadAiSettings } from "@/ai/settings";
import { normalizeEvent } from "@/background/calendar";
import {
  applyTemplateVariables,
  buildSystemMessage,
  buildTemplateVariables,
  clipInputText,
  type PreparedAiInput,
  type PreparedOpenAiInput,
  prepareAiInput,
  prepareOpenAiInput,
} from "@/background/openai_common";
import { storageLocalGet, storageLocalGetTyped } from "@/background/storage";
import type { BackgroundResponse, SummaryTarget } from "@/background/types";
import { loadOpenAiModel } from "@/openai/settings";
import { ExtractedEventSchema } from "@/schemas/extracted_event";
import { safeParseJsonObject } from "@/schemas/json";
import type { ExtractedEvent } from "@/shared_types";
import type { LocalStorageData } from "@/storage/types";
import { toErrorMessage } from "@/utils/errors";
import {
  fetchChatCompletionOk,
  fetchChatCompletionText,
  fetchOpenAiChatCompletionOk,
  fetchOpenAiChatCompletionText,
} from "@/utils/openai";

type OpenAiTextRequest = {
  target: SummaryTarget;
  missingTextMessage: string;
  includeMissingMeta?: boolean;
  buildBody: (params: PreparedOpenAiInput) => {
    body: unknown;
    emptyContentMessage: string;
  };
};

type AiTextRequest = {
  target: SummaryTarget;
  missingTextMessage: string;
  includeMissingMeta?: boolean;
  buildBody: (params: PreparedAiInput) => {
    body: ChatRequestBody;
    emptyContentMessage: string;
  };
};

async function _requestOpenAiText(
  params: OpenAiTextRequest
): Promise<Result.Result<string, string>> {
  const preparedResult = await prepareOpenAiInput({
    target: params.target,
    missingTextMessage: params.missingTextMessage,
    includeMissingMeta: params.includeMissingMeta,
  });
  if (Result.isFailure(preparedResult)) {
    return Result.fail(preparedResult.error);
  }

  const { settings, clippedText, meta } = preparedResult.value;
  const { body, emptyContentMessage } = params.buildBody({
    settings,
    clippedText,
    meta,
  });

  return await fetchOpenAiChatCompletionText(
    fetch,
    settings.token,
    body,
    emptyContentMessage
  );
}

async function requestAiText(
  params: AiTextRequest
): Promise<Result.Result<string, string>> {
  const preparedResult = await prepareAiInput({
    target: params.target,
    missingTextMessage: params.missingTextMessage,
    includeMissingMeta: params.includeMissingMeta,
  });
  if (Result.isFailure(preparedResult)) {
    return Result.fail(preparedResult.error);
  }

  const { settings, clippedText, meta } = preparedResult.value;
  const { body, emptyContentMessage } = params.buildBody({
    settings,
    clippedText,
    meta,
  });

  const adapter = getAdapter(settings.provider);

  return await fetchChatCompletionText(
    fetch,
    adapter,
    settings.token,
    body,
    emptyContentMessage
  );
}

export async function summarizeWithOpenAI(
  target: SummaryTarget
): Promise<BackgroundResponse> {
  const summaryResult = await requestAiText({
    target,
    missingTextMessage: "要約対象のテキストが見つかりませんでした",
    includeMissingMeta: true,
    buildBody: ({ settings, clippedText, meta }) => ({
      body: {
        model: settings.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: buildSystemMessage(
              "あなたは日本語の要約アシスタントです。入力テキストを読み、要点を短く整理して出力してください。",
              settings.customPrompt
            ),
          },
          {
            role: "user",
            content: [
              "次のテキストを日本語で要約してください。",
              "",
              "要件:",
              "- 重要ポイントを箇条書き(3〜7個)",
              "- 最後に一文で結論/要約",
              "- 事実と推測を混同しない",
              "",
              clippedText + meta,
            ].join("\n"),
          },
        ],
      },
      emptyContentMessage: "要約結果の取得に失敗しました",
    }),
  });
  if (Result.isFailure(summaryResult)) {
    return Result.fail(summaryResult.error);
  }

  return Result.succeed({
    summary: summaryResult.value,
    source: target.source,
  });
}

export async function runPromptActionWithOpenAI(
  target: SummaryTarget,
  promptTemplate: string
): Promise<Result.Result<string, string>> {
  return await requestAiText({
    target,
    missingTextMessage: "対象のテキストが見つかりませんでした",
    buildBody: ({ settings, clippedText, meta }) => {
      const variables = buildTemplateVariables(target, clippedText);
      const rendered = applyTemplateVariables(promptTemplate, variables);

      const needsText = !promptTemplate.includes("{{text}}");
      const needsMeta = !(
        promptTemplate.includes("{{title}}") ||
        promptTemplate.includes("{{url}}")
      );
      const userContent = [
        rendered.trim(),
        needsText ? `\n\n${clippedText}` : "",
        needsMeta ? meta : "",
      ]
        .join("")
        .trim();

      return {
        body: {
          model: settings.model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: buildSystemMessage(
                "あなたはユーザーの「Context Action」を実行するアシスタントです。指示に従い、必要な結果だけを簡潔に出力してください。",
                settings.customPrompt
              ),
            },
            { role: "user", content: userContent },
          ],
        },
        emptyContentMessage: "結果の取得に失敗しました",
      };
    },
  });
}

export function renderInstructionTemplate(
  template: string,
  target: SummaryTarget
): string {
  const raw = template.trim();
  if (!raw) {
    return "";
  }
  const shortText = clipInputText(target.text).slice(0, 1200);
  const variables = buildTemplateVariables(target, shortText);

  return applyTemplateVariables(raw, variables).trim();
}

async function resolveOpenAiToken(
  tokenOverride?: string
): Promise<Result.Result<string, string>> {
  const overrideToken = tokenOverride?.trim() ?? "";
  if (overrideToken) {
    return Result.succeed(overrideToken);
  }

  try {
    const data = (await storageLocalGet([
      "openaiApiToken",
    ])) as LocalStorageData;
    const storedToken = data.openaiApiToken?.trim() ?? "";
    if (!storedToken) {
      return Result.fail(
        "OpenAI API Tokenが未設定です（ポップアップの「設定」タブで設定してください）"
      );
    }
    return Result.succeed(storedToken);
  } catch (error) {
    return Result.fail(
      toErrorMessage(error, "OpenAI設定の読み込みに失敗しました")
    );
  }
}

async function resolveAiToken(
  tokenOverride?: string
): Promise<Result.Result<string, string>> {
  const overrideToken = tokenOverride?.trim() ?? "";
  if (overrideToken) {
    return Result.succeed(overrideToken);
  }

  try {
    const data = (await storageLocalGet([
      "aiProvider",
      "openaiApiToken",
      "anthropicApiToken",
      "zaiApiToken",
    ])) as LocalStorageData;

    // プロバイダー別トークン取得
    const provider = data.aiProvider ?? "openai";
    let storedToken = "";
    switch (provider) {
      case "openai":
        storedToken = data.openaiApiToken?.trim() ?? "";
        break;
      case "anthropic":
        storedToken = data.anthropicApiToken?.trim() ?? "";
        break;
      case "zai":
        storedToken = data.zaiApiToken?.trim() ?? "";
        break;
      default:
        storedToken = data.openaiApiToken?.trim() ?? "";
        break;
    }

    if (!storedToken) {
      return Result.fail(
        "API Tokenが未設定です（ポップアップの「設定」タブで設定してください）"
      );
    }
    return Result.succeed(storedToken);
  } catch (error) {
    return Result.fail(toErrorMessage(error, "AI設定の読み込みに失敗しました"));
  }
}

export async function testOpenAiToken(
  tokenOverride?: string
): Promise<Result.Result<void, string>> {
  const tokenResult = await resolveOpenAiToken(tokenOverride);
  if (Result.isFailure(tokenResult)) {
    return Result.fail(tokenResult.error);
  }

  const checkResult = await fetchOpenAiChatCompletionOk(
    fetch,
    tokenResult.value,
    {
      model: await loadOpenAiModel(storageLocalGetTyped),
      max_completion_tokens: 5,
      temperature: 0,
      messages: [
        { role: "system", content: "You are a health check bot." },
        { role: "user", content: "Reply with OK." },
      ],
    }
  );

  if (Result.isFailure(checkResult)) {
    return Result.fail(checkResult.error);
  }

  return Result.succeed(undefined);
}

export async function testAiToken(
  tokenOverride?: string
): Promise<Result.Result<void, string>> {
  const tokenResult = await resolveAiToken(tokenOverride);
  if (Result.isFailure(tokenResult)) {
    return Result.fail(tokenResult.error);
  }

  const storage = await storageLocalGetTyped([
    "aiProvider",
    "aiModel",
    "openaiApiToken",
    "anthropicApiToken",
    "zaiApiToken",
    "openaiModel",
  ]);
  const settingsResult = loadAiSettings(storage);
  if (Result.isFailure(settingsResult)) {
    return Result.fail(settingsResult.error);
  }

  const settings = settingsResult.value;
  const adapter = getAdapter(settings.provider);

  const checkResult = await fetchChatCompletionOk(
    fetch,
    adapter,
    tokenResult.value,
    {
      model: settings.model,
      max_completion_tokens: 5,
      temperature: 0,
      messages: [
        { role: "system", content: "You are a health check bot." },
        { role: "user", content: "Reply with OK." },
      ],
    }
  );

  if (Result.isFailure(checkResult)) {
    return Result.fail(checkResult.error);
  }

  return Result.succeed(undefined);
}

export async function extractEventWithOpenAI(
  target: SummaryTarget,
  extraInstruction?: string
): Promise<Result.Result<ExtractedEvent, string>> {
  const contentResult = await requestAiText({
    target,
    missingTextMessage: "要約対象のテキストが見つかりませんでした",
    includeMissingMeta: true,
    buildBody: ({ settings, clippedText, meta }) => {
      const baseSystemContent = [
        "あなたはイベント抽出アシスタントです。入力テキストから、カレンダー登録に必要な情報を抽出してください。",
        "出力は必ずJSONのみ。コードフェンス禁止。キーは title,start,end,allDay,location,description を使う。",
        "start/end はISO 8601 (例: 2025-01-31T19:00:00+09:00) を優先。難しければ YYYY-MM-DD HH:mm でもOK。",
        "YYYY/MM/DD や「2025年1月31日 19:00」のような表記は避けてください。",
        "日付しか不明な場合は YYYY-MM-DD でOK。",
        "end が不明なら省略可。allDay は終日なら true、それ以外は false または省略。",
        "description はイベントの概要を日本語で短くまとめる。",
      ].join("\n");

      // Anthropicでは response_format が非対応なので、プロバイダーに応じて分岐
      const body: ChatRequestBody = {
        model: settings.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: buildSystemMessage(
              baseSystemContent,
              settings.customPrompt,
              extraInstruction
            ),
          },
          {
            role: "user",
            content: [
              "次のテキストからイベント情報を抽出し、JSONで返してください。",
              "",
              clippedText + meta,
            ].join("\n"),
          },
        ],
      };

      // OpenAIとz.aiのみ response_format をサポート
      if (settings.provider === "openai" || settings.provider === "zai") {
        body.response_format = { type: "json_object" };
      }

      return {
        body,
        emptyContentMessage: "イベント要約結果の取得に失敗しました",
      };
    },
  });
  if (Result.isFailure(contentResult)) {
    return Result.fail(contentResult.error);
  }

  const eventResult = safeParseJsonObject(
    ExtractedEventSchema,
    contentResult.value
  );
  if (!eventResult.success) {
    return Result.fail("イベント情報の解析に失敗しました");
  }

  return Result.succeed(normalizeEvent(eventResult.output));
}
