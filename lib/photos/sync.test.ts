import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check } from "prettier";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Photo } from "../schemas.ts";
import { syncPhotos } from "./sync.ts";

let root: string;
let sourceDir: string;
let contentDir: string;
let publicDir: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "photos-sync-"));
  sourceDir = join(root, "source");
  contentDir = join(root, "content");
  publicDir = join(root, "public", "photos");
  await Promise.all(
    [sourceDir, contentDir, publicDir].map((dir) =>
      mkdir(dir, { recursive: true }),
    ),
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function makeJpeg(
  name: string,
  width: number,
  height: number,
  shade = 100,
): Promise<void> {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: shade, g: 100, b: 50 },
    },
  })
    .jpeg()
    .toFile(join(sourceDir, name));
}

const run = () => syncPhotos({ sourceDir, contentDir, publicDir });
const jsonPath = () => join(contentDir, "photos.json");
async function readPhotos(): Promise<Photo[]> {
  const parsed: Photo[] = JSON.parse(await readFile(jsonPath(), "utf8"));
  return parsed;
}

describe("syncPhotos", () => {
  it("creates entries and served files", async () => {
    await makeJpeg("Lake Momo.jpg", 400, 300);
    await makeJpeg("quebec.jpg", 300, 400);
    const report = await run();
    const photos = await readPhotos();
    expect(photos.map((p) => p.id)).toEqual(["lake-momo", "quebec"]);
    expect(existsSync(join(publicDir, "lake-momo.jpg"))).toBe(true);
    expect(existsSync(join(publicDir, "quebec.jpg"))).toBe(true);
    expect(report.added).toEqual(["Lake Momo.jpg", "quebec.jpg"]);
    expect(report.missingAlt).toEqual(["lake-momo", "quebec"]);
  });

  it("is a no-op the second time", async () => {
    await makeJpeg("Lake Momo.jpg", 400, 300);
    await makeJpeg("quebec.jpg", 300, 400);
    await run();
    const before = await Promise.all(
      [jsonPath(), join(publicDir, "lake-momo.jpg")].map((f) => stat(f)),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    const report = await run();
    expect(report.added).toEqual([]);
    expect(report.updated).toEqual([]);
    expect(report.renamed).toEqual([]);
    const after = await Promise.all(
      [jsonPath(), join(publicDir, "lake-momo.jpg")].map((f) => stat(f)),
    );
    expect(after.map((s) => s.mtimeMs)).toEqual(before.map((s) => s.mtimeMs));
  });

  it("renames the served file after a hand-edited id", async () => {
    await makeJpeg("Lake Momo.jpg", 400, 300);
    await run();
    const photos = await readPhotos();
    const edited = photos.map((p) =>
      Object.assign(p, {
        id: "lac-montmorency",
        alt: { fr: "Un lac", en: "A lake" },
      }),
    );
    await writeFile(jsonPath(), JSON.stringify(edited));
    const report = await run();
    expect(report.renamed).toEqual([
      { from: "lake-momo", to: "lac-montmorency" },
    ]);
    expect(existsSync(join(publicDir, "lake-momo.jpg"))).toBe(false);
    expect(existsSync(join(publicDir, "lac-montmorency.jpg"))).toBe(true);
    const [photo] = await readPhotos();
    expect(photo?.file).toBe("lac-montmorency.jpg");
    expect(photo?.alt).toEqual({ fr: "Un lac", en: "A lake" });
    expect(report.missingAlt).toEqual([]);
  });

  it("re-renders a changed original", async () => {
    await makeJpeg("quebec.jpg", 300, 400);
    await run();
    await makeJpeg("quebec.jpg", 500, 200, 20);
    const report = await run();
    expect(report.updated).toEqual(["quebec.jpg"]);
    const [photo] = await readPhotos();
    expect(photo?.width).toBe(500);
  });

  it("ignores other files", async () => {
    await makeJpeg("quebec.jpg", 300, 400);
    await writeFile(join(sourceDir, "notes.txt"), "hi");
    await writeFile(join(sourceDir, ".DS_Store"), "x");
    const report = await run();
    expect(report.ignored).toEqual(["notes.txt"]);
  });

  it("keeps an entry whose original is gone", async () => {
    await makeJpeg("quebec.jpg", 300, 400);
    await makeJpeg("lake.jpg", 300, 400);
    await run();
    await unlink(join(sourceDir, "quebec.jpg"));
    const report = await run();
    expect(report.missing).toEqual(["quebec.jpg"]);
    expect((await readPhotos()).map((p) => p.id)).toContain("quebec");
    expect(existsSync(join(publicDir, "quebec.jpg"))).toBe(true);
  });

  it("reports served files that match no entry without deleting them", async () => {
    await makeJpeg("quebec.jpg", 300, 400);
    await run();
    await writeFile(join(publicDir, "stray.jpg"), "x");
    const report = await run();
    expect(report.orphans).toEqual(["stray.jpg"]);
    expect(existsSync(join(publicDir, "stray.jpg"))).toBe(true);
  });

  it("writes Prettier-formatted JSON", async () => {
    await makeJpeg("quebec.jpg", 300, 400);
    await run();
    const content = await readFile(jsonPath(), "utf8");
    expect(await check(content, { parser: "json" })).toBe(true);
  });
});
