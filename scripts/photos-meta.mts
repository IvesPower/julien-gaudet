// Syncs a folder of original photos with public/photos/ and content/photos.json.
// Usage: pnpm photos:meta <folder>
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { syncPhotos } from "../lib/photos/sync.ts";

const folder = process.argv[2];
if (folder === undefined || folder === "") {
  console.error("Usage: pnpm photos:meta <folder>");
  process.exit(1);
}

const sourceDir =
  folder === "~" || folder.startsWith("~/")
    ? join(homedir(), folder.slice(1))
    : folder;

const report = await syncPhotos({
  sourceDir,
  contentDir: fileURLToPath(new URL("../content", import.meta.url)),
  publicDir: fileURLToPath(new URL("../public/photos", import.meta.url)),
});

const lines: Array<[string, string[]]> = [
  ["Added", report.added],
  ["Updated", report.updated],
  ["Renamed", report.renamed.map(({ from, to }) => `${from} -> ${to}`)],
  ["Original missing", report.missing],
  ["Ignored files", report.ignored],
  ["Unknown cameras", report.unknownCameras],
  ["Served files matching no entry", report.orphans],
  ["Missing alt text (fill in photos.json)", report.missingAlt],
];
let printed = false;
for (const [label, items] of lines) {
  if (items.length === 0) continue;
  console.log(`${label} (${items.length}): ${items.join(", ")}`);
  printed = true;
}
if (!printed) console.log("Everything is up to date.");
