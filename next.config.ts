import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Photos are served up to 2560 px at quality 90 only (no other quality is
  // allowed), in AVIF with a WebP fallback. `imageSizes` keeps its default.
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [90],
    deviceSizes: [640, 1080, 1600, 2048, 2560],
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// MDX files are imported by pages (content/projets/*.mdx), never routes, so
// `pageExtensions` stays the default. The frontmatter is read by
// lib/content.ts; remark-frontmatter keeps it out of the rendered body.
// Turbopack takes plugins by name.
const withMDX = createMDX({
  options: { remarkPlugins: ["remark-frontmatter"] },
});

export default withNextIntl(withMDX(nextConfig));
