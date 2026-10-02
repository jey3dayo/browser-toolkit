import { Result } from "@praha/byethrow";
import { formatEventText } from "@/background/calendar";
import {
  extractEventWithOpenAI,
  renderInstructionTemplate,
  runPromptActionWithOpenAI,
} from "@/background/openai";
import type { SummaryTarget } from "@/background/types";
import type { ContextAction } from "@/context_actions";
import { t } from "@/i18n";
import type { ExtractedEvent } from "@/shared_types";

type ContextActionExecutionParams = {
  action: ContextAction;
  target: SummaryTarget;
};

export type ContextActionOutput = {
  source: SummaryTarget["source"];
  text: string;
} & ({ kind: "text" } | { kind: "event"; event: ExtractedEvent });

/**
 * Execute an action for an already resolved target. Text actions require a
 * nonempty prompt; event actions may omit additional instructions. Both return
 * display text, while only event output includes the structured event.
 *
 * Expected validation/provider failures are Results. Unexpected exceptions
 * remain the caller's responsibility, as do wire payloads and notifications.
 */
export async function executeContextAction({
  action,
  target,
}: ContextActionExecutionParams): Promise<
  Result.Result<ContextActionOutput, string>
> {
  const prompt = action.prompt.trim();

  if (action.kind === "event") {
    const extraInstruction = prompt
      ? renderInstructionTemplate(action.prompt, target)
      : undefined;
    const result = await extractEventWithOpenAI(target, extraInstruction);
    if (Result.isFailure(result)) {
      return Result.fail(result.error);
    }

    return Result.succeed({
      event: result.value,
      kind: "event",
      source: target.source,
      text: formatEventText(result.value),
    });
  }

  if (!prompt) {
    return Result.fail(t("background.actionExecutor.emptyPrompt"));
  }

  const result = await runPromptActionWithOpenAI(target, prompt);
  if (Result.isFailure(result)) {
    return Result.fail(result.error);
  }

  return Result.succeed({
    kind: "text",
    source: target.source,
    text: result.value,
  });
}
