import { Result } from "@praha/byethrow";
import {
  type BaseIssue,
  type BaseSchema,
  literal,
  object,
  safeParse,
  string,
} from "valibot";
import { t } from "@/i18n";
import {
  mediaPathSegment,
  parseMediaUrl,
  toOriginalUrl,
} from "@/image-zoom/x-adapter";

const MEDIA_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
type AllowedExtension = "jpg" | "jpeg" | "png" | "webp" | "gif";
const ALLOWED_EXTENSIONS: readonly string[] = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
];

function isAllowedExtension(value: string): value is AllowedExtension {
  return ALLOWED_EXTENSIONS.includes(value);
}

function splitMediaId(segment: string): { id: string; ext: string | null } {
  const dotIndex = segment.lastIndexOf(".");
  if (dotIndex === -1) {
    return { ext: null, id: segment };
  }
  return { ext: segment.slice(dotIndex + 1), id: segment.slice(0, dotIndex) };
}

export type ValidatedTwimgMedia = {
  originalUrl: string;
  filename: string;
};

export function validateTwimgMediaUrl(
  rawUrl: string
): Result.Result<ValidatedTwimgMedia, string> {
  const url = parseMediaUrl(rawUrl);
  if (!url) {
    return Result.fail(t("imageZoom.errors.downloadInvalidUrl"));
  }

  const rawSegment = mediaPathSegment(url);
  if (rawSegment.length === 0 || rawSegment.includes("/")) {
    return Result.fail(t("imageZoom.errors.downloadInvalidUrl"));
  }

  let decodedSegment: string;
  try {
    decodedSegment = decodeURIComponent(rawSegment);
  } catch {
    return Result.fail(t("imageZoom.errors.downloadInvalidUrl"));
  }
  if (decodedSegment.includes("/") || decodedSegment.includes("..")) {
    return Result.fail(t("imageZoom.errors.downloadInvalidUrl"));
  }

  const { id, ext: pathExtension } = splitMediaId(decodedSegment);
  if (!MEDIA_ID_PATTERN.test(id)) {
    return Result.fail(t("imageZoom.errors.downloadInvalidUrl"));
  }

  const formatParam = url.searchParams.get("format");
  const candidateExtension =
    (formatParam ?? pathExtension)?.toLowerCase() ?? null;
  let extension: AllowedExtension = "jpg";
  if (candidateExtension !== null) {
    if (!isAllowedExtension(candidateExtension)) {
      return Result.fail(t("imageZoom.errors.downloadInvalidUrl"));
    }
    extension = candidateExtension;
  }

  const originalUrl = toOriginalUrl(rawUrl);
  if (!originalUrl) {
    return Result.fail(t("imageZoom.errors.downloadInvalidUrl"));
  }

  return Result.succeed({
    filename: `${id}.${extension}`,
    originalUrl,
  });
}

export type DownloadImagePayload = {
  action: "downloadImage";
  url: string;
};

export const downloadImageRequestSchema = object({
  action: literal("downloadImage"),
  url: string(),
}) satisfies BaseSchema<unknown, DownloadImagePayload, BaseIssue<unknown>>;

export function parseDownloadImageRequest(
  value: unknown
): DownloadImagePayload | null {
  const parsed = safeParse(downloadImageRequestSchema, value);
  return parsed.success ? parsed.output : null;
}
