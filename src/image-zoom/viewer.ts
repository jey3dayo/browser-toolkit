import { Result } from "@praha/byethrow";
import { t } from "@/i18n/lite";
import { requestImageDownload } from "@/image-zoom/download-request";
import { ensureViewerShadowMount } from "@/image-zoom/mount";
import {
  clampPan,
  clampScale,
  computeInitialTransform,
  computeZoomBounds,
  exceedsDragThreshold,
  panBy,
  type Transform,
  wheelScaleDelta,
  type ZoomBounds,
  zoomAroundPoint,
} from "@/image-zoom/zoom-math";
import componentButtonCss from "@/styles/tokens/components/button.css?raw";
import componentTokensCss from "@/styles/tokens/components/tokens.css?raw";
import { applyTheme, type Theme } from "@/ui/theme";

const HOST_ID = "browser-toolkit-image-zoom";
const VIEWER_TOKEN_CSS_ID = "mbu-image-zoom-token-extra";
const VIEWER_TOKEN_CSS = [componentTokensCss, componentButtonCss].join("\n");

type ViewerCleanup = () => void;

let currentHost: HTMLDivElement | null = null;
let currentShadow: ShadowRoot | null = null;
let currentCleanup: ViewerCleanup | null = null;
let previousActiveElement: HTMLElement | null = null;

export function isImageViewerOpen(): boolean {
  return currentHost !== null;
}

export function setImageViewerTheme(theme: Theme): void {
  if (currentShadow) {
    applyTheme(theme, currentShadow);
  }
}

export function closeImageViewer(): void {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  if (currentHost) {
    currentHost.remove();
    currentHost = null;
  }
  currentShadow = null;
  previousActiveElement?.focus();
  previousActiveElement = null;
}

type DragState = {
  moved: boolean;
  pointerId: number;
  startTransform: Transform;
  startX: number;
  startY: number;
};

function isWithinElement(target: EventTarget | null, el: Element): boolean {
  return target instanceof window.Node && el.contains(target);
}

export function openImageViewer(url: string, theme: Theme): void {
  closeImageViewer();
  previousActiveElement =
    document.activeElement instanceof window.HTMLElement
      ? document.activeElement
      : null;

  const mount = ensureViewerShadowMount({
    extraCss: VIEWER_TOKEN_CSS,
    extraCssId: VIEWER_TOKEN_CSS_ID,
    hostId: HOST_ID,
    theme,
  });
  currentHost = mount.host;
  currentShadow = mount.shadow;

  const backdrop = document.createElement("div");
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", t("imageZoom.dialogLabel"));
  backdrop.style.cssText = [
    "position: fixed",
    "inset: 0",
    "background: var(--color-scrim-strong)",
    "overflow: hidden",
    "z-index: 2147483647",
    "cursor: grab",
    "touch-action: none",
  ].join(";");

  const img = document.createElement("img");
  img.alt = "";
  img.style.cssText = [
    "position: absolute",
    "top: 0",
    "left: 0",
    "transform-origin: 0 0",
    "user-select: none",
  ].join(";");

  const controls = document.createElement("div");
  controls.style.cssText = [
    "position: fixed",
    "top: var(--spacing-md)",
    "right: var(--spacing-md)",
    "display: flex",
    "gap: var(--spacing-sm)",
    "z-index: 2147483647",
  ].join(";");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = t("imageZoom.close");
  closeButton.className = "btn btn-primary";

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.textContent = t("imageZoom.download");
  downloadButton.className = "btn btn-primary";

  controls.appendChild(closeButton);
  controls.appendChild(downloadButton);

  const errorText = document.createElement("p");
  errorText.setAttribute("role", "alert");
  errorText.style.cssText = [
    "position: fixed",
    "bottom: var(--spacing-md)",
    "left: 50%",
    "transform: translateX(-50%)",
    "color: var(--mbu-text)",
    "background: var(--mbu-surface)",
    "padding: var(--spacing-xs) var(--spacing-sm)",
    "border-radius: var(--radius-sm)",
    "display: none",
    "z-index: 2147483647",
  ].join(";");

  backdrop.appendChild(img);
  backdrop.appendChild(controls);
  backdrop.appendChild(errorText);
  mount.shadow.appendChild(backdrop);

  let transform: Transform = { scale: 1, x: 0, y: 0 };
  let bounds: ZoomBounds = { max: 10, min: 1 };
  let dragState: DragState | null = null;
  let pendingClickWasDrag = false;
  let imageLoaded = false;

  function applyTransform(): void {
    img.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
  }

  function clampCurrentPan(): void {
    transform = clampPan(
      transform,
      img.naturalWidth,
      img.naturalHeight,
      window.innerWidth,
      window.innerHeight
    );
  }

  function initTransformFromImage(): void {
    imageLoaded = true;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    img.style.width = `${img.naturalWidth}px`;
    img.style.height = `${img.naturalHeight}px`;
    bounds = computeZoomBounds(
      img.naturalWidth,
      img.naturalHeight,
      viewportWidth,
      viewportHeight
    );
    transform = computeInitialTransform(
      img.naturalWidth,
      img.naturalHeight,
      viewportWidth,
      viewportHeight
    );
    clampCurrentPan();
    applyTransform();
  }

  function handleImageError(): void {
    errorText.textContent = t("imageZoom.errors.loadFailed");
    errorText.style.display = "block";
  }

  function handleWheel(e: WheelEvent): void {
    e.preventDefault();
    transform = zoomAroundPoint(
      transform,
      { x: e.clientX, y: e.clientY },
      wheelScaleDelta(e.deltaY),
      bounds
    );
    clampCurrentPan();
    applyTransform();
  }

  function handleResize(): void {
    if (!imageLoaded) {
      return;
    }
    bounds = computeZoomBounds(
      img.naturalWidth,
      img.naturalHeight,
      window.innerWidth,
      window.innerHeight
    );
    transform = { ...transform, scale: clampScale(transform.scale, bounds) };
    clampCurrentPan();
    applyTransform();
  }

  function handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0 || isWithinElement(e.target, controls)) {
      return;
    }
    dragState = {
      moved: false,
      pointerId: e.pointerId,
      startTransform: transform,
      startX: e.clientX,
      startY: e.clientY,
    };
    backdrop.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!dragState || dragState.pointerId !== e.pointerId) {
      return;
    }
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    if (exceedsDragThreshold(deltaX, deltaY)) {
      dragState.moved = true;
    }
    transform = panBy(dragState.startTransform, deltaX, deltaY);
    clampCurrentPan();
    applyTransform();
  }

  function handlePointerUp(e: PointerEvent): void {
    if (!dragState || dragState.pointerId !== e.pointerId) {
      return;
    }
    pendingClickWasDrag = dragState.moved;
    dragState = null;
  }

  function handleBackdropClick(e: MouseEvent): void {
    if (isWithinElement(e.target, controls)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const wasDrag = pendingClickWasDrag;
    pendingClickWasDrag = false;
    if (!wasDrag) {
      closeImageViewer();
    }
  }

  function focusOtherControl(): void {
    if (mount.shadow.activeElement === downloadButton) {
      closeButton.focus();
    } else {
      downloadButton.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent): void {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      closeImageViewer();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      focusOtherControl();
    }
  }

  function handleKeyUp(e: KeyboardEvent): void {
    e.stopPropagation();
  }

  function handleKeyPress(e: KeyboardEvent): void {
    e.stopPropagation();
  }

  function handleCloseClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    closeImageViewer();
  }

  function handleDownloadClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    errorText.style.display = "none";
    requestImageDownload(url)
      .then((result) => {
        if (Result.isFailure(result)) {
          errorText.textContent = result.error;
          errorText.style.display = "block";
        }
      })
      .catch(() => {
        errorText.textContent = t("imageZoom.errors.downloadFailed");
        errorText.style.display = "block";
      });
  }

  img.addEventListener("load", initTransformFromImage, { once: true });
  img.addEventListener("error", handleImageError);
  backdrop.addEventListener("wheel", handleWheel, { passive: false });
  backdrop.addEventListener("pointerdown", handlePointerDown);
  backdrop.addEventListener("pointermove", handlePointerMove);
  backdrop.addEventListener("pointerup", handlePointerUp);
  backdrop.addEventListener("click", handleBackdropClick);
  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("keyup", handleKeyUp, true);
  window.addEventListener("keypress", handleKeyPress, true);
  window.addEventListener("resize", handleResize);
  closeButton.addEventListener("click", handleCloseClick);
  downloadButton.addEventListener("click", handleDownloadClick);

  currentCleanup = () => {
    img.removeEventListener("load", initTransformFromImage);
    img.removeEventListener("error", handleImageError);
    backdrop.removeEventListener("wheel", handleWheel);
    backdrop.removeEventListener("pointerdown", handlePointerDown);
    backdrop.removeEventListener("pointermove", handlePointerMove);
    backdrop.removeEventListener("pointerup", handlePointerUp);
    backdrop.removeEventListener("click", handleBackdropClick);
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("keyup", handleKeyUp, true);
    window.removeEventListener("keypress", handleKeyPress, true);
    window.removeEventListener("resize", handleResize);
    closeButton.removeEventListener("click", handleCloseClick);
    downloadButton.removeEventListener("click", handleDownloadClick);
  };

  img.src = url;
  downloadButton.focus();
}
