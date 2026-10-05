import { build, context } from "esbuild";
import {
  copyStyles,
  entryPoints,
  sharedBuildOptions,
  watchStyles,
} from "./build-shared.mjs";

const isWatch = process.argv.includes("--watch");

const buildOptions = {
  ...sharedBuildOptions,
  entryPoints,
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
