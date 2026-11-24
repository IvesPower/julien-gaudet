import { describe, expect, it } from "vitest";
import {
  experienceSchema,
  photosSchema,
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

  it("accepts a profile without instagram", () => {
    expect(
      profileSchema.safeParse({
        linkedin: "https://www.linkedin.com/in/juliengaudet/",
        github: "IvesPower",
      }).success,
    ).toBe(true);
  });

  it("rejects an instagram that is not a URL", () => {
    expect(
      rejects(profileSchema)({
        linkedin: "https://www.linkedin.com/in/juliengaudet/",
        github: "IvesPower",
        instagram: "julien",
      }),
    ).toBe(true);
  });

  it("rejects a linkedin that is not a URL", () => {
    expect(
      rejects(profileSchema)({ linkedin: "juliengaudet", github: "IvesPower" }),
    ).toBe(true);
  });
});

const ok = (value: unknown) => photosSchema.safeParse(value).success;

describe("photosSchema", () => {
  const minimal = {
    id: "black-and-white",
    file: "black-and-white.jpg",
    source: "IMG_0001.jpg",
    sourceHash: "a".repeat(64),
    width: 2560,
    height: 1707,
    blurDataURL: "data:image/jpeg;base64,AAAA",
    alt: { fr: "Un lac au matin.", en: "A lake in the morning." },
  };
  const full = {
    ...minimal,
    takenAt: "2024-05-12",
    exif: {
      camera: "Fujifilm X-T5",
      lens: "XF 35mm",
      focalLength: 35,
      aperture: 2,
      exposureTime: 0.004,
      iso: 400,
    },
    caption: { fr: "Brume.", en: "Mist." },
    place: { fr: "Annecy" },
    credit: "Julien Gaudet",
  };
  it("accepts a complete photo", () => {
    expect(ok([full])).toBe(true);
  });

  it("accepts a minimal photo", () => {
    expect(ok([minimal])).toBe(true);
  });

  it("rejects an alt without en", () => {
    expect(ok([{ ...minimal, alt: { fr: "Un lac." } }])).toBe(false);
  });

  it("rejects an empty alt.fr", () => {
    expect(ok([{ ...minimal, alt: { fr: "", en: "A lake." } }])).toBe(false);
  });

  it("rejects a blank alt.fr", () => {
    expect(ok([{ ...minimal, alt: { fr: "  ", en: "A lake." } }])).toBe(false);
  });

  it("rejects an id with spaces and capitals", () => {
    expect(ok([{ ...minimal, id: "Black and White" }])).toBe(false);
  });

  it("rejects an id starting with a dash", () => {
    expect(ok([{ ...minimal, id: "-a" }])).toBe(false);
  });

  it("rejects an unknown field such as gps", () => {
    expect(ok([{ ...minimal, gps: { latitude: 45, longitude: 6 } }])).toBe(
      false,
    );
  });

  it("rejects an uppercase file name", () => {
    expect(ok([{ ...minimal, file: "Lake.JPG" }])).toBe(false);
  });

  it("rejects two entries with the same id", () => {
    const result = photosSchema.safeParse([
      minimal,
      { ...minimal, source: "IMG_0002.jpg" },
    ]);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("duplicate id");
  });

  it("rejects two entries with the same source", () => {
    const result = photosSchema.safeParse([
      minimal,
      { ...minimal, id: "other", file: "other.jpg" },
    ]);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("duplicate source");
  });
});
