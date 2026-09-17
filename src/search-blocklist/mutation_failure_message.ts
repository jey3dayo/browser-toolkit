import { t } from "@/i18n";
import type { SearchBlocklistRuleMutation } from "@/search-blocklist/rules";

export function searchBlocklistMutationFailureMessage(
  op: SearchBlocklistRuleMutation["op"]
): string {
  if (op === "add") {
    return t("searchBlocklist.errors.addFailed");
  }
  if (op === "remove") {
    return t("searchBlocklist.errors.deleteFailed");
  }
  return t("searchBlocklist.errors.saveFailed");
}
