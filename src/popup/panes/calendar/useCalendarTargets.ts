import { Result } from "@praha/byethrow";
import { useCallback, useEffect, useState } from "react";
import { t } from "@/i18n";
import type { PopupRuntime } from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";
import type { CalendarRegistrationTarget } from "@/shared_types";
import type { Notifier } from "@/ui/toast";
import {
  DEFAULT_CALENDAR_TARGETS,
  resolveCalendarTargets,
} from "@/utils/calendar_targets";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export function useCalendarTargets(params: {
  runtime: PopupRuntime;
  notify: Notifier;
}): {
  targets: CalendarRegistrationTarget[];
  hasGoogle: boolean;
  hasIcs: boolean;
  toggleTarget: (target: CalendarRegistrationTarget) => void;
} {
  const { runtime, notify } = params;
  const [targets, setTargets] = useState<CalendarRegistrationTarget[]>(
    DEFAULT_CALENDAR_TARGETS
  );

  const hasGoogle = targets.includes("google");
  const hasIcs = targets.includes("ics");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await runtime.storageSyncGet(["calendarTargets"]);
      if (Result.isFailure(data)) {
        return;
      }
      if (cancelled) {
        return;
      }
      const next = resolveCalendarTargets(data.value.calendarTargets);
      setTargets(next);
    })().catch((error) => {
      debugLog(
        "CalendarPane.useEffect[runtime]",
        "failed",
        { error: formatErrorLog("", {}, error) },
        "error"
      ).catch(() => {
        // no-op
      });
    });
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  const saveTargets = useCallback(
    async (next: CalendarRegistrationTarget[]): Promise<void> => {
      await persistWithRollback({
        applyNext: () => {
          setTargets(next);
        },
        rollback: () => {
          setTargets(targets);
        },
        persist: () =>
          runtime.storageSyncSet({
            calendarTargets: next,
          }),
        onSuccess: () => {
          notify.success(t("calendarPane.success.saved"));
        },
        onFailure: () => {
          notify.error(t("calendarPane.errors.saveFailed"));
        },
      });
    },
    [notify, runtime, targets]
  );

  const toggleTarget = (target: CalendarRegistrationTarget): void => {
    const next = targets.includes(target)
      ? targets.filter((item) => item !== target)
      : [...targets, target];
    saveTargets(next).catch(() => {
      // no-op
    });
  };

  return { targets, hasGoogle, hasIcs, toggleTarget };
}
