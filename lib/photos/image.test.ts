import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gps } from "exifr";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  blurPlaceholder,
  hashFile,
  readPhotoExif,
  renderPhoto,
  scanPhoto,
} from "./image.ts";

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "photos-image-"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function makeJpeg(
  name: string,
  width: number,
  height: number,
  options: {
    exif?: Record<string, Record<string, string>>;
    orientation?: number;
  } = {},
): Promise<string> {
  const file = join(dir, name);
  let image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  });
  // sharp ignores an Orientation set through withExif, so it has its own option.
  if (options.exif) image = image.withExif(options.exif);
  if (options.orientation) {
    image = image.withMetadata({ orientation: options.orientation });
  }
  await image.jpeg().toFile(file);
  return file;
}

describe("renderPhoto", () => {
  it("shrinks the long edge to 2560 and keeps the ratio", async () => {
    const source = await makeJpeg("big.jpg", 4000, 3000);
    const size = await renderPhoto(source, join(dir, "big-out.jpg"));
    expect(size).toEqual({ width: 2560, height: 1920 });
  });

  it("never enlarges a small photo", async () => {
    const source = await makeJpeg("small.jpg", 1200, 1800);
    const size = await renderPhoto(source, join(dir, "small-out.jpg"));
    expect(size).toEqual({ width: 1200, height: 1800 });
  });

  it("applies the EXIF orientation", async () => {
    const source = await makeJpeg("rot.jpg", 3000, 2000, { orientation: 6 });
    const size = await renderPhoto(source, join(dir, "rot-out.jpg"));
    expect(size.width).toBeLessThan(size.height);
    expect(Math.abs(size.width - 1707)).toBeLessThanOrEqual(1);
    expect(size.height).toBe(2560);
  });

  it("strips every metadata, GPS included", async () => {
    const source = await makeJpeg("gps.jpg", 800, 600, {
      exif: {
        IFD0: { Make: "SONY", Model: "ILCE-7M4" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "45/1 30/1 0/1" },
      },
    });
    const target = join(dir, "gps-out.jpg");
    expect(await gps(await readFile(source))).toBeDefined();
    await renderPhoto(source, target);
    expect((await sharp(target).metadata()).exif).toBeUndefined();
    expect(await gps(await readFile(target))).toBeUndefined();
    const raw = await readPhotoExif(source);
    expect(raw?.Model).toBe("ILCE-7M4");
    expect(raw).not.toHaveProperty("latitude");
    expect(raw).not.toHaveProperty("GPSLatitude");
  });
});

describe("blurPlaceholder", () => {
  it("builds a tiny blur placeholder", async () => {
    const source = await makeJpeg("blur.jpg", 400, 300);
    const url = await blurPlaceholder(source);
    expect(url.startsWith("data:image/webp;base64,")).toBe(true);
    expect(url.length).toBeLessThan(1000);
  });
});

describe("hashFile", () => {
  it("hashes the original", async () => {
    const file = join(dir, "hash.txt");
    await writeFile(file, "hello");
    const first = await hashFile(file);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashFile(file)).toBe(first);
  });
});

describe("scanPhoto", () => {
  it("reads size and placeholder from the served file", async () => {
    const source = await makeJpeg("Scan Me.jpg", 4000, 3000, {
      exif: { IFD0: { Make: "SONY", Model: "ILCE-7M4" } },
    });
    const target = join(dir, "scan-me.jpg");
    const { scanned } = await scanPhoto(source, target, true);
    expect(scanned.source).toBe("Scan Me.jpg");
    expect(scanned.width).toBe(2560);
    expect(scanned.height).toBe(1920);
    expect(scanned.sourceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(scanned.exif?.camera).toBe("Sony A7 IV");
    expect(scanned.blurDataURL.startsWith("data:image/webp;base64,")).toBe(
      true,
    );
  });
});
