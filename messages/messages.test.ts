import { describe, expect, it } from "vitest";
import en from "./en.json";
import fr from "./fr.json";

type Tree = { [key: string]: string | Tree };

function flatten(
  tree: Tree,
  prefix = "",
  out: Record<string, string> = {},
): Record<string, string> {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else flatten(value, path, out);
  }
  return out;
}

describe("messages", () => {
  const frEntries = flatten(fr);
  const enEntries = flatten(en);

  it("has the same keys in French and English", () => {
    expect(Object.keys(enEntries).toSorted()).toEqual(
      Object.keys(frEntries).toSorted(),
    );
  });

  it("has no empty text", () => {
    const empty = Object.entries({ ...frEntries, ...enEntries }).filter(
      ([, value]) => value.trim() === "",
    );
    expect(empty).toEqual([]);
  });
});
