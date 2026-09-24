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

function pointInsideRect(
  point: { x: number; y: number },
  rect: DOMRect
): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

function findVisibleMediaImage(
  modal: Element,
  point: { x: number; y: number }
): HTMLImageElement | null {
  for (const img of modal.querySelectorAll("img")) {
    if (!isTargetImage(img) || img.closest("a")) {
      continue;
    }
    if (pointInsideRect(point, img.getBoundingClientRect())) {
      return img;
    }
  }
  return null;
}

export function pickTargetImage(
  stack: readonly Element[],
  point: { x: number; y: number }
): HTMLImageElement | null {
  const [top] = stack;
  const modal = top?.closest(LIGHTBOX_MODAL_SELECTOR);
  if (!modal) {
    return null;
  }

  for (const el of stack) {
    if (!modal.contains(el)) {
      break;
    }
    if (el.matches(INTERACTIVE_SELECTOR)) {
      return null;
    }
  }

  return findVisibleMediaImage(modal, point);
}
