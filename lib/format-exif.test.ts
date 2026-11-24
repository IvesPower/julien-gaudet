import { describe, expect, it } from "vitest";
import { formatExif } from "./format-exif";

const full = {
  camera: "Sony A7 IV",
  lens: "FE 24-70mm",
  focalLength: 24,
  aperture: 8,
  exposureTime: 0.0025,
  iso: 100,
};

describe("formatExif", () => {
  it("joins the shooting data without the lens", () => {
    expect(formatExif(full, "fr")).toBe(
      "Sony A7 IV · 24 mm · f/8 · 1/400 s · ISO 100",
    );
  });

  it("formats the aperture in the page language", () => {
    expect(formatExif({ aperture: 2.8 }, "fr")).toBe("f/2,8");
    expect(formatExif({ aperture: 2.8 }, "en")).toBe("f/2.8");
  });

  it("formats exposures of one second or more", () => {
    expect(formatExif({ exposureTime: 1.5 }, "fr")).toBe("1,5 s");
    expect(formatExif({ exposureTime: 1.5 }, "en")).toBe("1.5 s");
    expect(formatExif({ exposureTime: 2 }, "en")).toBe("2 s");
  });

  it("skips the missing items", () => {
    expect(formatExif({ camera: "Sony A7 IV", iso: 400 }, "en")).toBe(
      "Sony A7 IV · ISO 400",
    );
  });

  it("returns undefined when there is nothing to show", () => {
    expect(formatExif({}, "fr")).toBeUndefined();
    expect(formatExif({ lens: "FE 24-70mm" }, "fr")).toBeUndefined();
    expect(formatExif(undefined, "fr")).toBeUndefined();
  });
});
