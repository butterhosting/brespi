import { describe, expect, it } from "bun:test";
import { Prettify } from "./Prettify";
import { Temporal } from "@js-temporal/polyfill";

describe(Prettify.name, () => {
  describe(Prettify.timestamp.name, () => {
    type TestCase = {
      timestamp: Temporal.Instant;
      expectation: string;
    };
    const testCases: TestCase[] = [
      {
        timestamp: Temporal.Instant.from("2026-01-03T14:05:09Z"),
        expectation: "3 Jan 2026 at 14:05:09",
      },
      {
        timestamp: Temporal.Instant.from("2026-12-01T00:00:00Z"),
        expectation: "1 Dec 2026 at 00:00:00",
      },
      {
        timestamp: Temporal.Instant.from("2026-03-02T23:59:59Z"),
        expectation: "2 Mar 2026 at 23:59:59",
      },
      {
        timestamp: Temporal.Instant.from("2026-07-11T08:30:00Z"),
        expectation: "11 Jul 2026 at 08:30:00",
      },
      {
        timestamp: Temporal.Instant.from("2026-07-12T08:30:00Z"),
        expectation: "12 Jul 2026 at 08:30:00",
      },
      {
        timestamp: Temporal.Instant.from("2026-07-13T08:30:00Z"),
        expectation: "13 Jul 2026 at 08:30:00",
      },
      {
        timestamp: Temporal.Instant.from("2026-05-21T12:00:00Z"),
        expectation: "21 May 2026 at 12:00:00",
      },
      {
        timestamp: Temporal.Instant.from("2026-06-22T09:15:30Z"),
        expectation: "22 Jun 2026 at 09:15:30",
      },
    ];
    for (const { timestamp, expectation } of testCases) {
      it(`formats ${timestamp}`, async () => {
        // when
        const result = Prettify.timestamp(timestamp, "UTC");
        // then
        expect(result).toEqual(expectation);
      });
    }
  });
});
