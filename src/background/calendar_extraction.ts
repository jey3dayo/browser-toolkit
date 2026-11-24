import { Result } from "@praha/byethrow";
import { extractEventWithAi } from "@/background/ai_requests";
import {
  buildCalendarArtifacts,
  type CalendarArtifacts,
} from "@/background/calendar";
import { storageSyncGet } from "@/background/storage";
import type { SummaryTarget, SyncStorageData } from "@/background/types";
import type {
  CalendarRegistrationTarget,
  ExtractedEvent,
} from "@/shared_types";
import { resolveCalendarTargets } from "@/utils/calendar_targets";

export type ExtractedCalendarArtifacts = CalendarArtifacts & {
  event: ExtractedEvent;
  targets: CalendarRegistrationTarget[];
};

async function loadCalendarTargets(): Promise<
  CalendarRegistrationTarget[]
> {
  const stored = (await storageSyncGet(["calendarTargets"])) as SyncStorageData;
  return resolveCalendarTargets(stored.calendarTargets);
}

export async function extractCalendarArtifacts(params: {
  target: SummaryTarget;
  targets?: CalendarRegistrationTarget[];
  extraInstruction?: string;
}): Promise<Result.Result<ExtractedCalendarArtifacts, string>> {
  const result = await extractEventWithAi(
    params.target,
    params.extraInstruction
  );
  if (Result.isFailure(result)) {
    return Result.fail(result.error);
  }

  const targets = params.targets ?? (await loadCalendarTargets());
  return Result.succeed({
    event: result.value,
    targets,
    ...buildCalendarArtifacts(result.value, targets),
  });
}
