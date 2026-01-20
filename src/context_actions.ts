import {
  CODE_REVIEW_PROMPT,
  SUMMARIZE_PROMPT,
  TRANSLATE_JA_PROMPT,
} from "@/prompts/context_actions";
import { isRecord } from "@/utils/guards";
import { normalizeOptionalText } from "@/utils/text";

export type ContextActionKind = "text" | "event";

export type ContextAction = {
  id: string;
  title: string;
  kind: ContextActionKind;
  prompt: string;
};

export const DEFAULT_CONTEXT_ACTIONS: ContextAction[] = [
  {
    id: "builtin:summarize",
    title: "要約",
    kind: "text",
    prompt: SUMMARIZE_PROMPT,
  },
  {
    id: "builtin:translate-ja",
    title: "日本語に翻訳",
    kind: "text",
    prompt: TRANSLATE_JA_PROMPT,
  },
  {
    id: "builtin:code-review",
    title: "コードレビュー",
    kind: "text",
    prompt: CODE_REVIEW_PROMPT,
  },
];

function coerceContextAction(value: unknown): ContextAction | null {
  if (!isRecord(value)) {
    return null;
  }
  const raw = value as Partial<ContextAction>;
  const id = normalizeOptionalText(raw.id);
  const title = normalizeOptionalText(raw.title);
  if (!(id && title)) {
    return null;
  }
  const prompt = typeof raw.prompt === "string" ? raw.prompt : "";
  switch (raw.kind) {
    case "event":
    case "text":
      return { id, title, kind: raw.kind, prompt };
    default:
      return null;
  }
}

export function normalizeContextActions(value: unknown): ContextAction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const actions: ContextAction[] = [];
  for (const item of value) {
    const action = coerceContextAction(item);
    if (!action) {
      continue;
    }
    if (action.id === "builtin:calendar") {
      continue;
    }
    actions.push(action);
  }
  return actions;
}
