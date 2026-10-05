import { Result } from "@praha/byethrow";
import {
  extractEventWithAi,
  renderInstructionTemplate,
  runPromptActionWithAi,
} from "@/background/ai_requests";
import { formatEventText } from "@/background/calendar";
import type { SummaryTarget } from "@/background/types";
import type { ContextAction } from "@/context_actions";
import { t } from "@/i18n";
import type { ExtractedEvent } from "@/shared_types";

type ContextActionExecutionParams = {
  action: ContextAction;
  target: SummaryTarget;
};

type ContextActionOutput = {
  source: SummaryTarget["source"];
  text: string;
} & ({ kind: "text" } | { kind: "event"; event: ExtractedEvent });

/**
 * Expected action/provider failures return Results; unexpected exceptions propagate.
 * Target resolution and presentation remain the caller's responsibility.
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
    const result = await extractEventWithAi(target, extraInstruction);
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

  const result = await runPromptActionWithAi(target, prompt);
  if (Result.isFailure(result)) {
    return Result.fail(result.error);
  }

  return Result.succeed({
    kind: "text",
    source: target.source,
    text: result.value,
  });
}
