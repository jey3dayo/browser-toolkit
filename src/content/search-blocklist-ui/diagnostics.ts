import type { SearchBlocklistDiagnosticsResponse } from "@/content-script-messages";
import type { BlocklistSnapshot } from "@/search-blocklist/types";

export function buildDiagnosticsResponse(
  snapshot: BlocklistSnapshot | null
): SearchBlocklistDiagnosticsResponse {
  if (!snapshot) {
    return { available: false };
  }
  return {
    available: true,
    blockedCount: snapshot.blockedCount,
    detectedCount: snapshot.entries.length,
    engineId: snapshot.engineId,
    ruleRevision: snapshot.ruleRevision,
  };
}
