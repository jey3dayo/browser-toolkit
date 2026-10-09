import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import type {
  GetSearchBlocklistDiagnosticsMessage,
  SearchBlocklistDiagnosticsResponse,
} from "@/content-script-messages";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { isRecord } from "@/utils/guards";

export type SearchBlocklistDiagnosticsPanelState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "noSearchTab" }
  | { status: "error" }
  | {
      status: "ready";
      detectedCount: number;
      blockedCount: number;
      ruleRevision: number;
      engineId: string;
    };

const MAX_SEARCH_BLOCKLIST_ENGINE_ID_LENGTH = 200;

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function toSearchBlocklistDiagnosticsPanelState(
  value: unknown
): SearchBlocklistDiagnosticsPanelState {
  if (!isRecord(value) || typeof value.available !== "boolean") {
    return { status: "error" };
  }
  if (!value.available) {
    return { status: "unavailable" };
  }
  if (
    isNonNegativeFiniteNumber(value.detectedCount) &&
    isNonNegativeFiniteNumber(value.blockedCount) &&
    isNonNegativeFiniteNumber(value.ruleRevision) &&
    typeof value.engineId === "string" &&
    value.engineId.length <= MAX_SEARCH_BLOCKLIST_ENGINE_ID_LENGTH
  ) {
    return {
      blockedCount: value.blockedCount,
      detectedCount: value.detectedCount,
      engineId: value.engineId,
      ruleRevision: value.ruleRevision,
      status: "ready",
    };
  }
  return { status: "error" };
}

export function useSearchBlocklistDiagnostics(
  runtime: PopupPaneBaseProps["runtime"]
): SearchBlocklistDiagnosticsPanelState {
  const [state, setState] = useState<SearchBlocklistDiagnosticsPanelState>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tabId = await runtime.getSearchResultTabId();
      if (cancelled) {
        return;
      }
      if (Result.isFailure(tabId)) {
        setState({ status: "error" });
        return;
      }
      if (tabId.value === null) {
        setState({ status: "noSearchTab" });
        return;
      }
      const response = await runtime.sendMessageToTab<
        GetSearchBlocklistDiagnosticsMessage,
        SearchBlocklistDiagnosticsResponse
      >(tabId.value, { action: "getSearchBlocklistDiagnostics" });
      if (cancelled) {
        return;
      }
      if (Result.isFailure(response)) {
        setState({ status: "error" });
        return;
      }
      setState(toSearchBlocklistDiagnosticsPanelState(response.value));
    })().catch(() => {
      if (!cancelled) {
        setState({ status: "error" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  return state;
}
