import fsp from "node:fs/promises";

await fsp.mkdir("dist/styles", { recursive: true });
await fsp.cp("src/styles", "dist/styles", { recursive: true });
