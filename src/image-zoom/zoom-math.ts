export type Transform = {
  scale: number;
  x: number;
  y: number;
};

export type ZoomBounds = {
  min: number;
  max: number;
};

const MAX_SCALE = 10;
const DRAG_THRESHOLD_PX = 4;

export function computeFitScale(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return 1;
  }
  return Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
}

export function computeZoomBounds(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): ZoomBounds {
  const fitScale = computeFitScale(
    imageWidth,
    imageHeight,
    viewportWidth,
    viewportHeight
  );
  return { max: MAX_SCALE, min: Math.min(fitScale, 1) };
}

export function clampScale(scale: number, bounds: ZoomBounds): number {
  return Math.min(Math.max(scale, bounds.min), bounds.max);
}

export function computeInitialTransform(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): Transform {
  const scale = Math.min(
    computeFitScale(imageWidth, imageHeight, viewportWidth, viewportHeight),
    1
  );
  return {
    scale,
    x: (viewportWidth - imageWidth * scale) / 2,
    y: (viewportHeight - imageHeight * scale) / 2,
  };
}

const MIN_VISIBLE_PX = 80;

export function clampPan(
  transform: Transform,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): Transform {
  const scaledWidth = imageWidth * transform.scale;
  const scaledHeight = imageHeight * transform.scale;
  const minVisibleX = Math.min(MIN_VISIBLE_PX, scaledWidth);
  const minVisibleY = Math.min(MIN_VISIBLE_PX, scaledHeight);
  return {
    scale: transform.scale,
    x: Math.min(
      Math.max(transform.x, minVisibleX - scaledWidth),
      viewportWidth - minVisibleX
    ),
    y: Math.min(
      Math.max(transform.y, minVisibleY - scaledHeight),
      viewportHeight - minVisibleY
    ),
  };
}

export function zoomAroundPoint(
  transform: Transform,
  pointRelativeToOrigin: { x: number; y: number },
  scaleDelta: number,
  bounds: ZoomBounds
): Transform {
  const nextScale = clampScale(transform.scale * scaleDelta, bounds);
  const ratio = nextScale / transform.scale;
  return {
    scale: nextScale,
    x:
      pointRelativeToOrigin.x - (pointRelativeToOrigin.x - transform.x) * ratio,
    y:
      pointRelativeToOrigin.y - (pointRelativeToOrigin.y - transform.y) * ratio,
  };
}

export function panBy(
  transform: Transform,
  deltaX: number,
  deltaY: number
): Transform {
  return { ...transform, x: transform.x + deltaX, y: transform.y + deltaY };
}

export function exceedsDragThreshold(deltaX: number, deltaY: number): boolean {
  return Math.hypot(deltaX, deltaY) > DRAG_THRESHOLD_PX;
}

export function wheelScaleDelta(deltaY: number): number {
  const ZOOM_INTENSITY = 0.0015;
  return Math.exp(-deltaY * ZOOM_INTENSITY);
}
