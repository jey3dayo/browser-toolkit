import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import type {
  SearchBlocklistMutateRequest,
  SearchBlocklistMutateResponse,
} from "@/background/runtime_types";
import { t } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import {
  compileSearchBlocklistPattern,
  listDisplayableSearchBlocklistRules,
  normalizeSearchBlocklistPattern,
  validateSearchBlocklistRules,
} from "@/search-blocklist/rules";
import type { SearchBlocklistRule } from "@/search-blocklist/types";

export type UseSearchBlocklistRulesResult = {
  rules: SearchBlocklistRule[];
  corrupted: boolean;
  corruptedCount: number;
  patternInput: string;
  setPatternInput: (value: string) => void;
  addRule: () => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  editingId: string | null;
  editingValue: string;
  setEditingValue: (value: string) => void;
  startEditing: (rule: SearchBlocklistRule) => void;
  cancelEditing: () => void;
  saveEditing: (id: string) => Promise<void>;
};

function patternsAreEquivalent(left: string, right: string): boolean {
  const leftNormalized = normalizeSearchBlocklistPattern(left);
  const rightNormalized = normalizeSearchBlocklistPattern(right);
  return (
    Result.isSuccess(leftNormalized) &&
    Result.isSuccess(rightNormalized) &&
    leftNormalized.value === rightNormalized.value
  );
}

type SearchBlocklistMutatePayload = {
  rules: SearchBlocklistRule[];
  revision: number;
  skippedCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSearchBlocklistRule(value: unknown): value is SearchBlocklistRule {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.pattern === "string" &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt)
  );
}

function isSearchBlocklistRuleList(
  value: unknown
): value is SearchBlocklistRule[] {
  return Array.isArray(value) && value.every(isSearchBlocklistRule);
}

function isSearchBlocklistMutatePayload(
  value: unknown
): value is SearchBlocklistMutatePayload {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isSearchBlocklistRuleList(value.rules) &&
    typeof value.revision === "number" &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0 &&
    typeof value.skippedCount === "number" &&
    Number.isSafeInteger(value.skippedCount) &&
    value.skippedCount >= 0
  );
}

function hasCorruptedPattern(rule: SearchBlocklistRule): boolean {
  const normalized = normalizeSearchBlocklistPattern(rule.pattern);
  if (Result.isFailure(normalized)) {
    return true;
  }
  return Result.isFailure(compileSearchBlocklistPattern(normalized.value));
}

function exceedsRuleLimit(rules: SearchBlocklistRule[]): boolean {
  return Result.isFailure(
    validateSearchBlocklistRules(
      rules.filter((rule) => !hasCorruptedPattern(rule))
    )
  );
}

function countCorruptedStoredRules(
  stored: unknown,
  displayable: SearchBlocklistRule[]
): number {
  const storedCount = Array.isArray(stored) ? stored.length : 0;
  const undisplayableCount = storedCount - displayable.length;
  return displayable.filter(hasCorruptedPattern).length + undisplayableCount;
}

function mutationFailureMessage(
  op: SearchBlocklistMutateRequest["op"]
): string {
  if (op === "add") {
    return t("searchBlocklist.errors.addFailed");
  }
  if (op === "remove") {
    return t("searchBlocklist.errors.deleteFailed");
  }
  return t("searchBlocklist.errors.saveFailed");
}

async function sendSearchBlocklistMutation(
  props: PopupPaneBaseProps,
  request: SearchBlocklistMutateRequest
): Promise<Result.Result<SearchBlocklistMutatePayload, string>> {
  const sent = await props.runtime.sendMessageToBackground<
    SearchBlocklistMutateRequest,
    SearchBlocklistMutateResponse
  >(request);
  if (Result.isFailure(sent)) {
    return sent;
  }

  const response = sent.value;
  if (!isRecord(response)) {
    return Result.fail(mutationFailureMessage(request.op));
  }
  if (response.type === "Failure") {
    return typeof response.error === "string"
      ? Result.fail(response.error)
      : Result.fail(mutationFailureMessage(request.op));
  }
  if (
    response.type !== "Success" ||
    !isSearchBlocklistMutatePayload(response.value)
  ) {
    return Result.fail(mutationFailureMessage(request.op));
  }
  return Result.succeed(response.value);
}

export function useSearchBlocklistRules(
  props: PopupPaneBaseProps
): UseSearchBlocklistRulesResult {
  const [rules, setRules] = useState<SearchBlocklistRule[]>([]);
  const [corruptedCount, setCorruptedCount] = useState(0);
  const [overLimit, setOverLimit] = useState(false);
  const [patternInput, setPatternInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRules(): Promise<void> {
      const data = await props.runtime.storageLocalGet([
        "searchBlocklistRules",
      ]);
      if (cancelled || Result.isFailure(data)) {
        return;
      }
      const stored = data.value.searchBlocklistRules ?? [];
      const displayable = listDisplayableSearchBlocklistRules(stored);
      setRules(displayable);
      setCorruptedCount(countCorruptedStoredRules(stored, displayable));
      setOverLimit(exceedsRuleLimit(displayable));
    }

    loadRules().catch(() => {
      // no-op: fail open with an empty list
    });

    const onChanged =
      typeof chrome === "undefined" ? undefined : chrome.storage?.onChanged;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ): void => {
      if (areaName !== "local" || !("searchBlocklistRules" in changes)) {
        return;
      }
      loadRules().catch(() => {
        // no-op: keep the previous list on reload failure
      });
    };
    onChanged?.addListener(handleStorageChange);

    return () => {
      cancelled = true;
      onChanged?.removeListener(handleStorageChange);
    };
  }, [props.runtime]);

  const startEditing = (rule: SearchBlocklistRule): void => {
    setEditingId(rule.id);
    setEditingValue(rule.pattern);
  };

  const cancelEditing = (): void => {
    setEditingId(null);
    setEditingValue("");
  };

  const addRule = async (): Promise<void> => {
    const raw = patternInput.trim();
    if (!raw) {
      props.notify.error(t("searchBlocklist.errors.patternRequired"));
      return;
    }
    const normalized = normalizeSearchBlocklistPattern(raw);
    if (Result.isFailure(normalized)) {
      props.notify.error(normalized.error);
      return;
    }

    const latest = rules;
    if (
      latest.some((rule) =>
        patternsAreEquivalent(rule.pattern, normalized.value)
      )
    ) {
      props.notify.info(t("searchBlocklist.info.duplicate"));
      setPatternInput("");
      return;
    }

    const response = await sendSearchBlocklistMutation(props, {
      action: "searchBlocklistMutate",
      op: "add",
      pattern: normalized.value,
    });
    if (Result.isFailure(response)) {
      props.notify.error(response.error);
      return;
    }

    setRules(response.value.rules);
    setCorruptedCount(response.value.skippedCount);
    setOverLimit(exceedsRuleLimit(response.value.rules));
    setPatternInput("");
    props.notify.success(t("searchBlocklist.success.added"));
  };

  const removeRule = async (id: string): Promise<void> => {
    const response = await sendSearchBlocklistMutation(props, {
      action: "searchBlocklistMutate",
      op: "remove",
      ruleIds: [id],
    });
    if (Result.isFailure(response)) {
      props.notify.error(response.error);
      return;
    }

    setRules(response.value.rules);
    setCorruptedCount(response.value.skippedCount);
    setOverLimit(exceedsRuleLimit(response.value.rules));
    props.notify.success(t("searchBlocklist.success.deleted"));
  };

  const saveEditing = async (id: string): Promise<void> => {
    const raw = editingValue.trim();
    if (!raw) {
      props.notify.error(t("searchBlocklist.errors.patternRequired"));
      return;
    }
    const normalized = normalizeSearchBlocklistPattern(raw);
    if (Result.isFailure(normalized)) {
      props.notify.error(normalized.error);
      return;
    }

    const latest = rules;
    if (
      latest.some(
        (rule) =>
          rule.id !== id &&
          patternsAreEquivalent(rule.pattern, normalized.value)
      )
    ) {
      props.notify.info(t("searchBlocklist.info.duplicate"));
      return;
    }

    const response = await sendSearchBlocklistMutation(props, {
      action: "searchBlocklistMutate",
      op: "update",
      pattern: normalized.value,
      ruleId: id,
    });
    if (Result.isFailure(response)) {
      props.notify.error(response.error);
      return;
    }

    setRules(response.value.rules);
    setCorruptedCount(response.value.skippedCount);
    setOverLimit(exceedsRuleLimit(response.value.rules));
    cancelEditing();
    props.notify.success(t("searchBlocklist.success.updated"));
  };

  return {
    addRule,
    cancelEditing,
    corrupted: corruptedCount > 0 || overLimit,
    corruptedCount,
    editingId,
    editingValue,
    patternInput,
    removeRule,
    rules,
    saveEditing,
    setEditingValue,
    setPatternInput,
    startEditing,
  };
}
