import { Result } from "@praha/byethrow";
import { ensureShadowMount } from "@/content/shadow_mount";
import { t } from "@/i18n";
import { requestImageDownload } from "@/image-zoom/download-request";
import {
  computeInitialTransform,
  computeZoomBounds,
  exceedsDragThreshold,
  panBy,
  type Transform,
  wheelScaleDelta,
  type ZoomBounds,
  zoomAroundPoint,
} from "@/image-zoom/zoom-math";
import type { Theme } from "@/ui/theme";

const HOST_ID = "browser-toolkit-image-zoom";
const ROOT_ID = "mbu-image-zoom-root";

type ViewerCleanup = () => void;

let currentHost: HTMLDivElement | null = null;
let currentCleanup: ViewerCleanup | null = null;
let previousActiveElement: HTMLElement | null = null;

export function isImageViewerOpen(): boolean {
  return currentHost !== null;
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

  const mount = ensureShadowMount({ hostId: HOST_ID, rootId: ROOT_ID, theme });
  currentHost = mount.host;

  const backdrop = document.createElement("div");
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", t("imageZoom.dialogLabel"));
  backdrop.style.cssText = [
    "position: fixed",
    "inset: 0",
    "background: rgba(0, 0, 0, 0.92)",
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

  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.textContent = t("imageZoom.download");
  downloadButton.className = "btn btn-primary";
  downloadButton.style.cssText = [
    "position: fixed",
    "top: var(--spacing-md)",
    "right: var(--spacing-md)",
    "z-index: 2147483647",
  ].join(";");

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
  backdrop.appendChild(downloadButton);
  backdrop.appendChild(errorText);
  mount.shadow.appendChild(backdrop);

  let transform: Transform = { scale: 1, x: 0, y: 0 };
  let bounds: ZoomBounds = { max: 10, min: 1 };
  let dragState: DragState | null = null;
  let pendingClickWasDrag = false;

  function applyTransform(): void {
    img.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
  }

  function initTransformFromImage(): void {
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
    applyTransform();
  }

  function handleWheel(e: WheelEvent): void {
    e.preventDefault();
    transform = zoomAroundPoint(
      transform,
      { x: e.clientX, y: e.clientY },
      wheelScaleDelta(e.deltaY),
      bounds
    );
    applyTransform();
  }

  function handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0 || isWithinElement(e.target, downloadButton)) {
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
    if (isWithinElement(e.target, downloadButton)) {
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

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeImageViewer();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
    }
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
  backdrop.addEventListener("wheel", handleWheel, { passive: false });
  backdrop.addEventListener("pointerdown", handlePointerDown);
  backdrop.addEventListener("pointermove", handlePointerMove);
  backdrop.addEventListener("pointerup", handlePointerUp);
  backdrop.addEventListener("click", handleBackdropClick);
  window.addEventListener("keydown", handleKeyDown, true);
  downloadButton.addEventListener("click", handleDownloadClick);

  currentCleanup = () => {
    img.removeEventListener("load", initTransformFromImage);
    backdrop.removeEventListener("wheel", handleWheel);
    backdrop.removeEventListener("pointerdown", handlePointerDown);
    backdrop.removeEventListener("pointermove", handlePointerMove);
    backdrop.removeEventListener("pointerup", handlePointerUp);
    backdrop.removeEventListener("click", handleBackdropClick);
    window.removeEventListener("keydown", handleKeyDown, true);
    downloadButton.removeEventListener("click", handleDownloadClick);
  };

  img.src = url;
  downloadButton.focus();
}
