import type { MDXComponents } from "mdx/types";

// Required by @next/mdx with the App Router. MDX elements render as plain
// HTML until the design arrives.
const components: MDXComponents = {};

export function useMDXComponents(): MDXComponents {
  return components;
}
