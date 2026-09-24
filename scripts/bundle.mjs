import { build, context } from "esbuild";
import {
  copyStyles,
  sharedBuildOptions,
  watchStyles,
} from "./build-shared.mjs";

const isWatch = process.argv.includes("--watch");

const buildOptions = {
  ...sharedBuildOptions,
  entryPoints: [
    "src/background.ts",
    "src/content.ts",
    "src/popup.ts",
    "src/options.ts",
    "src/focus-override.ts",
    "src/search-blocklist.ts",
    "src/image-zoom.ts",
  ],
  minify: !isWatch,
  outdir: "dist",
  sourcemap: isWatch,
};

try {
  if (isWatch) {
    await copyStyles();
    watchStyles();
    const ctx = await context({
      ...buildOptions,
      plugins: [
        ...buildOptions.plugins,
        {
          name: "rebuild-logger",
          setup(pluginBuild) {
            pluginBuild.onEnd((result) => {
              if (result.errors.length > 0) {
                console.error("[esbuild] rebuild failed", result.errors);
              } else {
                console.log("[esbuild] rebuild succeeded");
              }
            });
          },
        },
      ],
    });
    await ctx.watch();
    console.log("[esbuild] watching for changes...");
  } else {
    await build(buildOptions);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
