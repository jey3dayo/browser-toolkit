import { describe, expect, it } from "vitest";
import {
  clampPan,
  clampScale,
  computeFitScale,
  computeInitialTransform,
  computeZoomBounds,
  exceedsDragThreshold,
  panBy,
  zoomAroundPoint,
} from "@/image-zoom/zoom-math";

describe("image-zoom zoom-math: computeFitScale / computeZoomBounds", () => {
  it("fits a large image inside the viewport with scale below 1", () => {
    const fitScale = computeFitScale(4000, 3000, 1000, 800);
    expect(fitScale).toBeCloseTo(Math.min(1000 / 4000, 800 / 3000));
  });

  it("clamps the minimum bound to 1 for a small image (never below natural size)", () => {
    const bounds = computeZoomBounds(100, 100, 1000, 800);
    expect(bounds.min).toBe(1);
    expect(bounds.max).toBe(10);
  });

  it("uses fitScale as the minimum bound for a large image", () => {
    const bounds = computeZoomBounds(4000, 3000, 1000, 800);
    expect(bounds.min).toBeCloseTo(Math.min(1000 / 4000, 800 / 3000));
    expect(bounds.max).toBe(10);
  });
});

describe("image-zoom zoom-math: clampScale", () => {
  it("clamps within [min, max]", () => {
    const bounds = { max: 10, min: 0.5 };
    expect(clampScale(0.1, bounds)).toBe(0.5);
    expect(clampScale(20, bounds)).toBe(10);
    expect(clampScale(2, bounds)).toBe(2);
  });
});

describe("image-zoom zoom-math: computeInitialTransform", () => {
  it("centers a small image at scale 1 (fitScale above 1 is capped)", () => {
    const transform = computeInitialTransform(200, 100, 1000, 800);
    expect(transform).toEqual({ scale: 1, x: 400, y: 350 });
  });

  it("centers a large image at min(fitScale, 1) instead of 1", () => {
    const transform = computeInitialTransform(4000, 3000, 1000, 800);
    const fitScale = Math.min(1000 / 4000, 800 / 3000);
    expect(transform.scale).toBeCloseTo(fitScale);
    expect(transform.scale).toBeLessThan(1);
    expect(transform.x).toBeCloseTo((1000 - 4000 * fitScale) / 2);
    expect(transform.y).toBeCloseTo((800 - 3000 * fitScale) / 2);
  });
});

describe("image-zoom zoom-math: clampPan", () => {
  it("keeps at least min(80px, scaled size) of the image inside the viewport when panned far off-screen", () => {
    const transform = { scale: 1, x: -100_000, y: -100_000 };
    const clamped = clampPan(transform, 500, 400, 1000, 800);

    expect(clamped.x + 500).toBeGreaterThanOrEqual(80);
    expect(clamped.x).toBeLessThanOrEqual(1000 - 80);
    expect(clamped.y + 400).toBeGreaterThanOrEqual(80);
    expect(clamped.y).toBeLessThanOrEqual(800 - 80);
  });

  it("does not move a transform that already keeps the image visible", () => {
    const transform = { scale: 1, x: 100, y: 50 };
    const clamped = clampPan(transform, 500, 400, 1000, 800);
    expect(clamped).toEqual(transform);
  });

  it("uses the scaled size as the minimum when it is smaller than 80px", () => {
    const transform = { scale: 1, x: -1000, y: -1000 };
    const clamped = clampPan(transform, 50, 40, 1000, 800);
    expect(clamped.x + 50).toBeGreaterThanOrEqual(50);
    expect(clamped.y + 40).toBeGreaterThanOrEqual(40);
  });
});

describe("image-zoom zoom-math: zoomAroundPoint", () => {
  it("keeps the point under the cursor fixed while zooming in", () => {
    const bounds = { max: 10, min: 1 };
    const transform = { scale: 1, x: 0, y: 0 };
    const point = { x: 50, y: 50 };
    const next = zoomAroundPoint(transform, point, 2, bounds);

    expect(next.scale).toBe(2);
    const localX = (point.x - transform.x) / transform.scale;
    const localY = (point.y - transform.y) / transform.scale;
    expect(next.x + localX * next.scale).toBeCloseTo(point.x);
    expect(next.y + localY * next.scale).toBeCloseTo(point.y);
  });

  it("clamps the resulting scale to the bounds", () => {
    const bounds = { max: 10, min: 1 };
    const transform = { scale: 9, x: 0, y: 0 };
    const next = zoomAroundPoint(transform, { x: 0, y: 0 }, 5, bounds);
    expect(next.scale).toBe(10);
  });
});

describe("image-zoom zoom-math: panBy", () => {
  it("adds the delta to the current translate", () => {
    const transform = { scale: 2, x: 10, y: 20 };
    expect(panBy(transform, 5, -5)).toEqual({ scale: 2, x: 15, y: 15 });
  });
});

describe("image-zoom zoom-math: exceedsDragThreshold", () => {
  it("is false for movement within the threshold", () => {
    expect(exceedsDragThreshold(2, 2)).toBe(false);
  });

  it("is true for movement beyond the threshold", () => {
    expect(exceedsDragThreshold(10, 0)).toBe(true);
  });
});
