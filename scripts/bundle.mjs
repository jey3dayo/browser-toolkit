import { build, context } from "esbuild";
import { copyStyles, cssRawPlugin, watchStyles } from "./build-shared.mjs";

const isWatch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: [
    "src/background.ts",
    "src/content.ts",
    "src/popup.ts",
    "src/focus-override.ts",
  ],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  charset: "utf8",
  alias: {
    "@": "./src",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.GA4_MEASUREMENT_ID": JSON.stringify(
      process.env.GA4_MEASUREMENT_ID || ""
    ),
    "process.env.GA4_API_SECRET": JSON.stringify(
      process.env.GA4_API_SECRET || ""
    ),
  },
  loader: {
    ".toml": "text",
    ".css": "css",
  },
  outdir: "dist",
  sourcemap: isWatch,
  minify: !isWatch,
  plugins: [cssRawPlugin],
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
