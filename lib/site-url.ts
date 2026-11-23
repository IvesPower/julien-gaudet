/**
 * Absolute URL of the site, used as `metadataBase` so that canonical and
 * hreflang links are absolute. Vercel exposes the production host without
 * a scheme; local builds fall back to the Next.js default port.
 */
export function getSiteUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): URL {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL;
  return new URL(host ? `https://${host}` : "http://localhost:3000");
}
