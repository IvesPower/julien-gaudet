import { describe, expect, it } from "vitest";
import {
  experienceSchema,
  profileSchema,
  projectFrontmatterSchema,
} from "./schemas";

const valid = {
  kind: "work",
  contract: "permanent",
  start: "2024-01",
  role: { fr: "Développeur", en: "Developer" },
  org: "AXA France",
  highlights: [{ fr: "Un point." }],
  tags: ["React", { fr: "Hébergement", en: "Hosting" }],
};

const clips = {
  name: "podcleaner-clips",
  tagline: "Découpe les extraits de films.",
  status: "usable",
  platforms: ["macos", "windows"],
  stack: ["Python 3.11/3.12", "uv", "ffmpeg", "Whisper"],
  repo: "https://github.com/IvesPower/podcleaner-clips",
  license: "MIT",
  install: "uv tool install git+https://github.com/IvesPower/podcleaner-clips",
  order: 1,
};

const rejects =
  (schema: { safeParse: (v: unknown) => { success: boolean } }) =>
  (value: unknown) =>
    !schema.safeParse(value).success;

describe("experienceSchema", () => {
  const rejected = rejects(experienceSchema);

  it("accepts a valid experience", () => {
    expect(() => experienceSchema.parse(valid)).not.toThrow();
  });

  it("accepts a year-only education entry", () => {
    const { contract: _contract, ...rest } = valid;
    expect(
      experienceSchema.safeParse({
        ...rest,
        kind: "education",
        start: "2017",
        end: "2019",
      }).success,
    ).toBe(true);
  });

  it("rejects a missing role", () => {
    const { role: _role, ...rest } = valid;
    expect(rejected(rest)).toBe(true);
  });

  it('rejects an unknown kind ("job")', () => {
    expect(rejected({ ...valid, kind: "job" })).toBe(true);
  });

  it('rejects month 13 ("2024-13")', () => {
    expect(rejected({ ...valid, start: "2024-13" })).toBe(true);
  });

  it("rejects an end before the start", () => {
    expect(rejected({ ...valid, start: "2024-01", end: "2023-12" })).toBe(true);
  });

  it("rejects empty highlights", () => {
    expect(rejected({ ...valid, highlights: [] })).toBe(true);
  });

  it("rejects an unknown key", () => {
    expect(rejected({ ...valid, company: "AXA" })).toBe(true);
  });

  it("accepts an end in the start month", () => {
    expect(
      experienceSchema.safeParse({ ...valid, start: "2015-07", end: "2015-07" })
        .success,
    ).toBe(true);
  });

  it("accepts a year end in the start year", () => {
    expect(
      experienceSchema.safeParse({ ...valid, start: "2017-09", end: "2017" })
        .success,
    ).toBe(true);
  });
});

describe("projectFrontmatterSchema", () => {
  const rejected = rejects(projectFrontmatterSchema);

  it("accepts the podcleaner-clips frontmatter", () => {
    expect(() => projectFrontmatterSchema.parse(clips)).not.toThrow();
  });

  it('rejects status "done"', () => {
    expect(rejected({ ...clips, status: "done" })).toBe(true);
  });

  it("rejects a non-GitHub repo", () => {
    expect(rejected({ ...clips, repo: "https://gitlab.com/x" })).toBe(true);
  });

  it("rejects empty platforms", () => {
    expect(rejected({ ...clips, platforms: [] })).toBe(true);
  });

  it("accepts a missing install", () => {
    const { install: _install, ...rest } = clips;
    expect(projectFrontmatterSchema.safeParse(rest).success).toBe(true);
  });
});

describe("profileSchema", () => {
  it("accepts the profile", () => {
    expect(
      profileSchema.safeParse({
        linkedin: "https://www.linkedin.com/in/juliengaudet/",
        github: "IvesPower",
      }).success,
    ).toBe(true);
  });

  it("rejects a linkedin that is not a URL", () => {
    expect(
      rejects(profileSchema)({ linkedin: "juliengaudet", github: "IvesPower" }),
    ).toBe(true);
  });
});
