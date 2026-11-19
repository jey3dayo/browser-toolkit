import { Result } from "@praha/byethrow";
import type {
  RuntimeSendResponse,
  SearchBlocklistMutateRequest,
  SearchBlocklistMutateResponse,
} from "@/background/runtime_types";
import { searchBlocklistMutationFailureMessage } from "@/search-blocklist/mutation_failure_message";
import {
  applySearchBlocklistRuleMutation,
  partitionStoredSearchBlocklistRules,
  type SearchBlocklistRulePartition,
} from "@/search-blocklist/rules";
import { storageLocalGet, storageLocalSet } from "@/storage/helpers";
import { isRecord } from "@/utils/guards";

let mutationQueue: Promise<unknown> = Promise.resolve();

const SEARCH_BLOCKLIST_REVISION_KEY = "searchBlocklistRevision";

type LoadedSearchBlocklist = {
  partition: SearchBlocklistRulePartition;
  revision: number;
};

function parseStoredSearchBlocklistRevision(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

async function loadSearchBlocklistRules(
  op: SearchBlocklistMutateRequest["op"]
): Promise<Result.Result<LoadedSearchBlocklist, string>> {
  const loaded = await storageLocalGet<unknown>([
    "searchBlocklistRules",
    SEARCH_BLOCKLIST_REVISION_KEY,
  ]);
  if (Result.isFailure(loaded)) {
    return Result.fail(searchBlocklistMutationFailureMessage(op));
  }
  const stored = isRecord(loaded.value)
    ? loaded.value.searchBlocklistRules
    : undefined;
  const revision = parseStoredSearchBlocklistRevision(
    isRecord(loaded.value)
      ? loaded.value[SEARCH_BLOCKLIST_REVISION_KEY]
      : undefined
  );
  return Result.succeed({
    partition: partitionStoredSearchBlocklistRules(stored),
    revision,
  });
}

async function applySearchBlocklistMutation(
  request: SearchBlocklistMutateRequest
): Promise<SearchBlocklistMutateResponse> {
  const loaded = await loadSearchBlocklistRules(request.op);
  if (Result.isFailure(loaded)) {
    return loaded;
  }

  const mutated = applySearchBlocklistRuleMutation(loaded.value.partition, {
    op: request.op,
    pattern: request.pattern,
    ruleId: request.ruleId,
    ruleIds: request.ruleIds,
  });
  if (Result.isFailure(mutated)) {
    return mutated;
  }

  // Persist the next revision together with the rules so a service worker
  // restart can never roll the revision back below what clients have seen.
  const nextRevision = loaded.value.revision + 1;
  const saved = await storageLocalSet({
    [SEARCH_BLOCKLIST_REVISION_KEY]: nextRevision,
    searchBlocklistRules: mutated.value.persisted,
  });
  if (Result.isFailure(saved)) {
    return Result.fail(searchBlocklistMutationFailureMessage(request.op));
  }

  return Result.succeed({
    revision: nextRevision,
    rules: mutated.value.rules,
    skippedCount: mutated.value.skippedCount,
  });
}

function handleSearchBlocklistMutateRequest(
  request: SearchBlocklistMutateRequest,
  sendResponse: RuntimeSendResponse
): boolean {
  const operation = mutationQueue
    .catch(() => undefined)
    .then(() => applySearchBlocklistMutation(request));
  mutationQueue = operation;
  operation
    .then((result) => {
      sendResponse(result);
    })
    .catch((error: unknown) => {
      sendResponse(
        Result.fail(
          error instanceof Error
            ? error.message
            : searchBlocklistMutationFailureMessage(request.op)
        )
      );
    });
  return true;
}

export const searchBlocklistRuntimeHandlers = {
  searchBlocklistMutate: handleSearchBlocklistMutateRequest,
} as const;
