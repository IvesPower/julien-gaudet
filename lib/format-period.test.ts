import { describe, expect, it } from "vitest";
import { formatPeriod } from "./format-period";

describe("formatPeriod", () => {
  it("formats an ongoing period in French", () => {
    expect(formatPeriod("2024-01", undefined, "fr", "aujourd’hui")).toBe(
      "janv. 2024 – aujourd’hui",
    );
  });

  it("formats an ongoing period in English", () => {
    expect(formatPeriod("2024-01", undefined, "en", "present")).toBe(
      "Jan 2024 – present",
    );
  });

  it("formats a closed period in French", () => {
    expect(formatPeriod("2015-07", "2015-10", "fr", "…")).toBe(
      "juil. 2015 – oct. 2015",
    );
  });

  it("formats a closed period in English", () => {
    expect(formatPeriod("2022-06", "2022-11", "en", "…")).toBe(
      "Jun 2022 – Nov 2022",
    );
  });

  it("formats year-only periods", () => {
    expect(formatPeriod("2017", "2019", "fr", "…")).toBe("2017 – 2019");
  });

  it("uses UTC, whatever the machine time zone", () => {
    expect(formatPeriod("2024-01", "2024-01", "en", "…")).toBe(
      "Jan 2024 – Jan 2024",
    );
  });
});
