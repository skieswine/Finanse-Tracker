// Copies the pdf.js worker into /public so it is served from our own origin
// (works offline in the PWA and needs no third-party CDN). Runs on postinstall.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(dirname(require.resolve("pdfjs-dist/package.json")), "legacy", "build", "pdf.worker.min.mjs");

mkdirSync(join(root, "public"), { recursive: true });
copyFileSync(src, join(root, "public", "pdf.worker.legacy.min.mjs"));
