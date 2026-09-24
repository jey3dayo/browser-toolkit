const LIGHTBOX_ROUTE_PATTERN = /^\/[^/]+\/status\/\d+\/photo\/\d+\/?$/;
const MEDIA_HOST = "pbs.twimg.com";
const MEDIA_PATH_PREFIX = "/media/";

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
const LIGHTBOX_MODAL_SELECTOR = '[aria-modal="true"]';

export function isLightboxRoute(pathname: string): boolean {
  return LIGHTBOX_ROUTE_PATTERN.test(pathname);
}

export function parseMediaUrl(rawUrl: string): URL | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== MEDIA_HOST ||
    !url.pathname.startsWith(MEDIA_PATH_PREFIX)
  ) {
    return null;
  }
  return url;
}

export function mediaPathSegment(url: URL): string {
  return url.pathname.slice(MEDIA_PATH_PREFIX.length);
}

export function isTargetImage(el: unknown): el is HTMLImageElement {
  if (!(el instanceof window.HTMLImageElement)) {
    return false;
  }
  const src = el.currentSrc || el.src;
  return parseMediaUrl(src) !== null;
}

export function toOriginalUrl(rawUrl: string): string | null {
  const url = parseMediaUrl(rawUrl);
  if (!url) {
    return null;
  }
  url.searchParams.set("name", "orig");
  return url.toString();
}

function isAcceptedMediaImage(
  img: Element,
  topmost: Element | undefined
): boolean {
  const modal = img.closest(LIGHTBOX_MODAL_SELECTOR);
  if (!modal || img.closest("a")) {
    return false;
  }
  return topmost !== undefined && modal.contains(topmost);
}

export function pickTargetImage(
  elements: readonly Element[]
): HTMLImageElement | null {
  const [topmost] = elements;
  for (const el of elements) {
    if (isTargetImage(el)) {
      if (isAcceptedMediaImage(el, topmost)) {
        return el;
      }
      continue;
    }
    if (el.matches(INTERACTIVE_SELECTOR)) {
      return null;
    }
  }
  return null;
}
