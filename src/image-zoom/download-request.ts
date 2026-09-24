import { Result } from "@praha/byethrow";
import { t } from "@/i18n";
import type { DownloadImagePayload } from "@/image-zoom/download-url";
import { isRecord } from "@/utils/guards";

export async function requestImageDownload(
  url: string
): Promise<Result.Result<Record<string, never>, string>> {
  try {
    const request: DownloadImagePayload = { action: "downloadImage", url };
    const response = await chrome.runtime.sendMessage<
      DownloadImagePayload,
      unknown
    >(request);
    if (!isRecord(response)) {
      return Result.fail(t("imageZoom.errors.downloadFailed"));
    }
    if (response.type === "Failure") {
      return typeof response.error === "string"
        ? Result.fail(response.error)
        : Result.fail(t("imageZoom.errors.downloadFailed"));
    }
    if (response.type !== "Success") {
      return Result.fail(t("imageZoom.errors.downloadFailed"));
    }
    return Result.succeed({});
  } catch (error) {
    return Result.fail(
      error instanceof Error
        ? error.message
        : t("imageZoom.errors.downloadFailed")
    );
  }
}
