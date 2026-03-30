import fsp from "node:fs/promises";

await fsp.rm("dist", { force: true, recursive: true });
