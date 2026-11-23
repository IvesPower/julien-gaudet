import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getExperiences, getProfile, resolveText } from "./content";

/** Writes the given files in a fresh temporary content folder. */
async function writeContent(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "content-"));
  await Promise.all(
    Object.entries(files).map(async ([name, body]) => {
      const file = path.join(dir, name);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
    }),
  );
  return dir;
}

const entry = (fields: Record<string, unknown>) => ({
  kind: "work",
  role: { fr: "Rôle", en: "Role" },
  org: "Org",
  highlights: [{ fr: "Point." }],
  tags: [],
  ...fields,
});

const timeline = (entries: unknown[]) =>
  writeContent({ "parcours.json": JSON.stringify(entries) });

describe("resolveText", () => {
  it("gives a plain string the page language", () => {
    expect(resolveText("AXA France", "en")).toEqual({
      text: "AXA France",
      lang: "en",
    });
  });

  it("picks the page language", () => {
    expect(resolveText({ fr: "Lille", en: "Lille, France" }, "en")).toEqual({
      text: "Lille, France",
      lang: "en",
    });
  });

  it("falls back to French", () => {
    expect(resolveText({ fr: "Diplôme" }, "en")).toEqual({
      text: "Diplôme",
      lang: "fr",
    });
  });
});

describe("getExperiences", () => {
  it("sorts by start date, newest first, within each group", async () => {
    const dir = await timeline([
      entry({ start: "2016-01", end: "2019-08" }),
      entry({ start: "2024-01" }),
      entry({ start: "2022-06", end: "2022-11" }),
      entry({ kind: "education", start: "2017", end: "2019" }),
    ]);
    const { work, education } = await getExperiences("fr", dir);
    expect(work.map((e) => e.start)).toEqual(["2024-01", "2022-06", "2016-01"]);
    expect(education).toHaveLength(1);
  });

  it("breaks a start tie with the end date, ongoing first", async () => {
    const dir = await timeline([
      entry({ start: "2022-11", end: "2023-02" }),
      entry({ start: "2022-11", end: "2024-01" }),
      entry({ start: "2022-11" }),
    ]);
    const { work } = await getExperiences("fr", dir);
    expect(work.map((e) => e.end)).toEqual([undefined, "2024-01", "2023-02"]);
  });

  it("keeps the file order on a full tie", async () => {
    const dir = await timeline([
      entry({ start: "2020-01", org: "First" }),
      entry({ start: "2020-01", org: "Second" }),
    ]);
    const { work } = await getExperiences("fr", dir);
    expect(work.map((e) => e.org.text)).toEqual(["First", "Second"]);
  });

  it("throws a ContentError naming the file and the field", async () => {
    const { role: _role, ...noRole } = entry({ start: "2020-01" });
    const dir = await timeline([noRole]);
    await expect(getExperiences("fr", dir)).rejects.toThrow(
      /parcours\.json: 0\.role/,
    );
  });

  it("loads the real content", async () => {
    const fr = await getExperiences("fr");
    expect(fr.work).toHaveLength(8);
    expect(fr.education).toHaveLength(4);
    expect(fr.work[0]?.org.text).toBe("AXA France");
    expect(fr.work[2]?.org.text).toBe("BOLD");
    const en = await getExperiences("en");
    expect(en.education[2]?.org.text).toBe("University of Lille");
  });
});

describe("getProfile", () => {
  it("loads the real profile", async () => {
    expect((await getProfile()).github).toBe("IvesPower");
  });
});
