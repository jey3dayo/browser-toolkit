import { Result } from "@praha/byethrow";
import { formatEventText } from "@/background/calendar";
import {
  extractEventWithOpenAI,
  renderInstructionTemplate,
  runPromptActionWithOpenAI,
} from "@/background/openai";
import type { SummaryTarget } from "@/background/types";
import type { ContextAction } from "@/context_actions";
import type { ExtractedEvent } from "@/shared_types";

/**
 * Action execution result type
 */
export type ActionExecutionResult<T> = Result.Result<T, string>;

/**
 * Event action execution parameters
 */
export interface EventActionParams {
  target: SummaryTarget;
  action: ContextAction;
}

/**
 * Prompt action execution parameters
 */
export interface PromptActionParams {
  target: SummaryTarget;
  action: ContextAction;
}

/**
 * Event action execution result
 */
export interface EventActionResult {
  event: ExtractedEvent;
  eventText: string;
  source: SummaryTarget["source"];
}

/**
 * Prompt action execution result
 */
export interface PromptActionResult {
  text: string;
  source: SummaryTarget["source"];
}

/**
 * Execute event action with OpenAI
 *
 * @param params - Event action parameters
 * @returns Result containing extracted event or error
 */
export async function executeEventAction(
  params: EventActionParams
): Promise<ActionExecutionResult<EventActionResult>> {
  const { target, action } = params;

  const extraInstruction = action.prompt?.trim()
    ? renderInstructionTemplate(action.prompt, target)
    : undefined;

  const result = await extractEventWithOpenAI(target, extraInstruction);

  if (Result.isFailure(result)) {
    return Result.fail(result.error);
  }

  const eventText = formatEventText(result.value);

  return Result.succeed({
    event: result.value,
    eventText,
    source: target.source,
  });
}

/**
 * Execute prompt action with OpenAI
 *
 * @param params - Prompt action parameters
 * @returns Result containing generated text or error
 */
export async function executePromptAction(
  params: PromptActionParams
): Promise<ActionExecutionResult<PromptActionResult>> {
  const { target, action } = params;

  const prompt = action.prompt.trim();
  if (!prompt) {
    return Result.fail("プロンプトが空です");
  }

  const result = await runPromptActionWithOpenAI(target, prompt);

  if (Result.isFailure(result)) {
    return Result.fail(result.error);
  }

  return Result.succeed({
    text: result.value,
    source: target.source,
  });
}
