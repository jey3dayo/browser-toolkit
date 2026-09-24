import { startImageZoomRuntime } from "@/image-zoom/runtime";

(() => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  startImageZoomRuntime();
})();
