import type { Notifier } from "@/ui/toast";

type RequireTrimmedStringParams = {
  value: string;
  emptyMessage: string;
  notify: Notifier;
};

export function requireTrimmedString(
  params: RequireTrimmedStringParams
): string | null {
  const trimmed = params.value.trim();
  if (trimmed) {
    return trimmed;
  }

  params.notify.error(params.emptyMessage);
  return null;
}
