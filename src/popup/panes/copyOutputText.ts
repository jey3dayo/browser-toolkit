import { Result } from "@praha/byethrow";
import { type TranslationKey, t } from "@/i18n";
import type { Notifier } from "@/ui/toast";
import { copyToClipboard } from "@/utils/clipboard";

type CopyOutputMessages = {
  success: TranslationKey;
  unavailable: TranslationKey;
  failed: TranslationKey;
};

export async function copyReadyOutputText(
  text: string,
  params: {
    notify: Notifier;
    messages: CopyOutputMessages;
  }
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }

  const result = await copyToClipboard(trimmed);
  if (Result.isSuccess(result)) {
    params.notify.success(t(params.messages.success));
    return;
  }
  params.notify.error(
    result.error.type === "unavailable"
      ? t(params.messages.unavailable)
      : t(params.messages.failed)
  );
}
