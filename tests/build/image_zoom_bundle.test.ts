import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";
import { sharedBuildOptions } from "../../scripts/build-shared.mjs";

const IMAGE_ZOOM_SIZE_BUDGET_BYTES = 90_000;

const DENYLISTED_INPUT_SEGMENTS = [
  "i18next",
  "/src/ui/styles.ts",
  "/src/content/",
  "/node_modules/react/",
  "/node_modules/.pnpm/react@",
];

// Some metafile inputs are absolute; strip projectRoot so the denylist can't
// match a segment of the checkout directory itself.
function normalizeInputPath(inputPath: string, projectRoot: string): string {
  const relative = path.isAbsolute(inputPath)
    ? path.relative(projectRoot, inputPath)
    : inputPath;
  return `/${relative.split(path.sep).join("/")}`;
}

describe("image-zoom bundle size budget", () => {
  it("stays under the ≤90KB minified budget and excludes i18next, ui/styles, content/*, and react", async () => {
    const projectRoot = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      ".."
    );

    const result = await build({
      ...sharedBuildOptions,
      absWorkingDir: projectRoot,
      entryPoints: [path.join(projectRoot, "src/image-zoom.ts")],
      metafile: true,
      minify: true,
      write: false,
    });

    const inputPaths = Object.keys(result.metafile?.inputs ?? {}).map(
      (inputPath) => normalizeInputPath(inputPath, projectRoot)
    );
    for (const segment of DENYLISTED_INPUT_SEGMENTS) {
      const offenders = inputPaths.filter((inputPath) =>
        inputPath.includes(segment)
      );
      expect(offenders, `unexpected input matching "${segment}"`).toEqual([]);
    }

    const outputBytes = result.outputFiles?.[0]?.contents.byteLength ?? 0;
    expect(outputBytes).toBeGreaterThan(0);
    expect(outputBytes).toBeLessThanOrEqual(IMAGE_ZOOM_SIZE_BUDGET_BYTES);
  });
});
