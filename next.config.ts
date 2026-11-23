import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// MDX files are imported by pages (content/projets/*.mdx), never routes, so
// `pageExtensions` stays the default. The frontmatter is read by
// lib/content.ts; remark-frontmatter keeps it out of the rendered body.
// Turbopack takes plugins by name.
const withMDX = createMDX({
  options: { remarkPlugins: ["remark-frontmatter"] },
});

export default withNextIntl(withMDX(nextConfig));
