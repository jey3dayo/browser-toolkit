import { Result } from "@praha/byethrow";
import {
  OPENAI_MODEL_OPTIONS as OPENAI_MODEL_OPTIONS_SCHEMA,
  type OpenAiModelOption as OpenAiModelOptionSchema,
  safeParseOpenAiModel,
} from "@/schemas/openai";
import type { LocalStorageData } from "@/storage/types";
import { toErrorMessage } from "@/utils/errors";

export const DEFAULT_OPENAI_MODEL = "gpt-5.2";
export const OPENAI_MODEL_OPTIONS = OPENAI_MODEL_OPTIONS_SCHEMA;
export type OpenAiModelOption = OpenAiModelOptionSchema;

export type OpenAiSettings = {
  token: string;
  customPrompt: string;
  model: OpenAiModelOption;
};

export function normalizeOpenAiModel(value: unknown): OpenAiModelOption {
  const parsed = safeParseOpenAiModel(value);
  return parsed.success ? parsed.output : DEFAULT_OPENAI_MODEL;
}

export function loadOpenAiSettings(
  storageLocalGet: (
    keys: (keyof LocalStorageData)[]
  ) => Promise<Partial<LocalStorageData>>
): Result.ResultAsync<OpenAiSettings, string> {
  return Result.pipe(
    Result.try({
      immediate: true,
      try: () =>
        storageLocalGet([
          "openaiApiToken",
          "openaiCustomPrompt",
          "openaiModel",
        ]),
      catch: (error) =>
        toErrorMessage(error, "OpenAI設定の読み込みに失敗しました"),
    }),
    Result.map((data) => ({
      token: data.openaiApiToken?.trim() ?? "",
      customPrompt: data.openaiCustomPrompt?.trim() ?? "",
      model: normalizeOpenAiModel(data.openaiModel),
    })),
    Result.andThen((settings) =>
      settings.token
        ? Result.succeed(settings)
        : Result.fail("OpenAI API Tokenが未設定です")
    )
  );
}

export async function loadOpenAiModel(
  storageLocalGet: (
    keys: (keyof LocalStorageData)[]
  ) => Promise<Partial<LocalStorageData>>
): Promise<OpenAiModelOption> {
  try {
    const data = await storageLocalGet(["openaiModel"]);
    return normalizeOpenAiModel(data.openaiModel);
  } catch {
    return DEFAULT_OPENAI_MODEL;
  }
}
