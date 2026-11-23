// Fails when a page under app/[locale]/ is no longer prerendered at build time
// (for example after a missing setRequestLocale or a call to headers()).
// Run after `pnpm build`.
import { readFileSync } from "node:fs";
import { routing } from "../i18n/routing.ts";

const manifest: { routes: Record<string, unknown> } = JSON.parse(
  readFileSync(
    new URL("../.next/prerender-manifest.json", import.meta.url),
    "utf8",
  ),
);

const staticPathnames = Object.keys(routing.pathnames).filter(
  (pathname) => !pathname.includes("["),
);
const expected = routing.locales.flatMap((locale) =>
  staticPathnames.map(
    (pathname) => `/${locale}${pathname === "/" ? "" : pathname}`,
  ),
);
const missing = expected.filter((path) => !(path in manifest.routes));

if (missing.length > 0) {
  console.error(
    `Pages not prerendered (${missing.length}):\n${missing.map((p) => `  ${p}`).join("\n")}`,
  );
  process.exit(1);
}
console.log(`All ${expected.length} pages are prerendered.`);
