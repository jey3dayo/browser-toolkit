import { t } from "@/i18n";

export function coerceSummarySourceLabel(source: unknown): string {
  if (source === "selection") {
    return t("overlay.source.selection");
  }
  if (source === "page") {
    return t("overlay.source.page");
  }
  return "-";
}
