import { Result } from "@praha/byethrow";
import { useEffect, useMemo, useState } from "react";
import {
  type ContextAction,
  DEFAULT_CONTEXT_ACTIONS,
  normalizeContextActions,
} from "@/context_actions";
import type { PopupRuntime } from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";
import type { Notifier } from "@/ui/toast";

export function useActions(params: {
  runtime: PopupRuntime;
  notify: Notifier;
  onEditorReset?: () => void;
}): {
  actions: ContextAction[];
  actionsById: Map<string, ContextAction>;
  setActions: (actions: ContextAction[]) => void;
  persistActionsUpdate: (
    nextActions: ContextAction[],
    successMessage: string,
    failureMessage: string
  ) => Promise<void>;
  resetActions: () => Promise<void>;
} {
  const [actions, setActions] = useState<ContextAction[]>([]);

  const actionsById = useMemo(
    () => new Map(actions.map((action) => [action.id, action])),
    [actions]
  );

  useEffect(() => {
    let cancelled = false;
    const setActionsSafe = (next: ContextAction[]): void => {
      if (!cancelled) {
        setActions(next);
      }
    };

    (async () => {
      const data = await params.runtime.storageSyncGet(["contextActions"]);
      if (Result.isSuccess(data)) {
        const normalized = normalizeContextActions(data.value.contextActions);
        if (normalized.length > 0) {
          setActionsSafe(normalized);
          return;
        }
      }

      setActionsSafe(DEFAULT_CONTEXT_ACTIONS);
      await params.runtime
        .storageSyncSet({
          contextActions: DEFAULT_CONTEXT_ACTIONS,
        })
        .catch(() => {
          // no-op
        });
    })().catch(() => {
      // no-op
    });
    return () => {
      cancelled = true;
    };
  }, [params.runtime]);

  const persistActionsUpdate = async (
    nextActions: ContextAction[],
    successMessage: string,
    failureMessage: string
  ): Promise<void> => {
    const previous = actions;
    await persistWithRollback({
      applyNext: () => {
        setActions(nextActions);
        params.onEditorReset?.();
      },
      rollback: () => {
        setActions(previous);
      },
      persist: () =>
        params.runtime.storageSyncSet({
          contextActions: nextActions,
        }),
      onSuccess: () => {
        params.notify.success(successMessage);
      },
      onFailure: () => {
        params.notify.error(failureMessage);
      },
    });
  };

  const resetActions = async (): Promise<void> => {
    await persistActionsUpdate(
      DEFAULT_CONTEXT_ACTIONS,
      "リセットしました",
      "リセットに失敗しました"
    );
  };

  return {
    actions,
    actionsById,
    setActions,
    persistActionsUpdate,
    resetActions,
  };
}
