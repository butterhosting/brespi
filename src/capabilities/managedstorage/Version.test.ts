import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it, spyOn } from "bun:test";
import { Version } from "./Version";

describe(Version.now.name, () => {
  const truncateCases: Array<{
    timestamp: string;
    expectedVersion: string;
  }> = [
    { timestamp: "2018-01-13T15:19:36.469576466Z", expectedVersion: "2018-01-13T15:19:36.469Z" },
    { timestamp: "2019-02-13T15:25:17.673917671Z", expectedVersion: "2019-02-13T15:25:17.673Z" },
    { timestamp: "2020-03-13T15:25:49.66294966Z", expectedVersion: "2020-03-13T15:25:49.662Z" },
    { timestamp: "2021-04-13T15:26:36.915996913Z", expectedVersion: "2021-04-13T15:26:36.915Z" },
    { timestamp: "2022-05-13T15:26:00.481960477Z", expectedVersion: "2022-05-13T15:26:00.481Z" },
    { timestamp: "2023-06-13T15:26:06.490966487Z", expectedVersion: "2023-06-13T15:26:06.490Z" },
    { timestamp: "2024-07-13T15:26:11.887971885Z", expectedVersion: "2024-07-13T15:26:11.887Z" },
    { timestamp: "2025-08-13T15:26:17.5Z", expectedVersion: "2025-08-13T15:26:17.500Z" },
    { timestamp: "2026-09-13T15:26:22.113982111Z", expectedVersion: "2026-09-13T15:26:22.113Z" },
  ];
  for (const { timestamp, expectedVersion } of truncateCases) {
    it(`truncates to millisecond precision: ${timestamp}`, () => {
      // given
      const instantSpy = spyOn(Temporal.Now, "instant");
      instantSpy.mockReturnValue(Temporal.Instant.from(timestamp));
      // when
      const version = Version.now();
      // then
      expect(version).toEqual(expectedVersion);
    });
  }

  it("produces offset-only format without timezone brackets", () => {
    const result = Version.now();
    expect(result).not.toContain("[");
    expect(result).not.toContain("]");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe(Version.compare.name, () => {
  it("returns negative when a is before b", () => {
    expect(Version.compare("2025-01-01T00:00:00.000+00:00", "2025-06-01T00:00:00.000+00:00")).toBeLessThan(0);
  });

  it("returns positive when a is after b", () => {
    expect(Version.compare("2025-06-01T00:00:00.000+00:00", "2025-01-01T00:00:00.000+00:00")).toBeGreaterThan(0);
  });

  it("returns zero for equal timestamps", () => {
    expect(Version.compare("2025-01-01T00:00:00.000+00:00", "2025-01-01T00:00:00.000+00:00")).toEqual(0);
  });

  it("compares correctly across offsets", () => {
    // 10:15-04:00 = 14:15Z (later than 14:00Z)
    expect(Version.compare("2025-07-10T10:15:00.000-04:00", "2025-07-10T14:00:00.000+00:00")).toBeGreaterThan(0);
  });
});

describe(Version.isValid.name, () => {
  it("accepts valid offset timestamps", () => {
    expect(Version.isValid("2025-01-01T00:00:00.000+00:00")).toEqual(true);
    expect(Version.isValid("2025-07-10T09:15:00.200-04:00")).toEqual(true);
    expect(Version.isValid("2025-11-25T22:45:00.300+09:00")).toEqual(true);
  });

  it("accepts legacy bracket format for backwards compatibility", () => {
    expect(Version.isValid("2025-01-01T00:00:00.000+00:00[UTC]")).toEqual(true);
    expect(Version.isValid("2025-07-10T09:15:00.200-04:00[America/New_York]")).toEqual(true);
  });

  it("rejects invalid strings", () => {
    expect(Version.isValid("not-a-timestamp")).toEqual(false);
    expect(Version.isValid("2025-01-01")).toEqual(false);
    expect(Version.isValid("")).toEqual(false);
  });
});
