import { describe, expect, it } from "bun:test";
import { CronJob } from "./CronJob";
import { Temporal } from "@js-temporal/polyfill";

describe(CronJob.name, async () => {
  const timeZoneTestSuite = {
    expression: "0 14 * * MON",
    monday: Temporal.Instant.from("2024-01-01T00:00:00Z"),
    testCases: [
      { timeZone: "UTC", expectation: "2024-01-01T14:00:00Z" },
      { timeZone: "Europe/Amsterdam", expectation: "2024-01-01T13:00:00Z" }, // UTC+1
      { timeZone: "America/New_York", expectation: "2024-01-01T19:00:00Z" }, // UTC-5
      { timeZone: "Europe/London", expectation: "2024-01-01T14:00:00Z" }, // GMT
      { timeZone: "America/Los_Angeles", expectation: "2024-01-01T22:00:00Z" }, // UTC-8
      { timeZone: "America/Chicago", expectation: "2024-01-01T20:00:00Z" }, // UTC-6
      { timeZone: "Asia/Tokyo", expectation: "2024-01-01T05:00:00Z" }, // UTC+9
      { timeZone: "Asia/Kolkata", expectation: "2024-01-01T08:30:00Z" }, // UTC+5:30
      { timeZone: "Australia/Sydney", expectation: "2024-01-01T03:00:00Z" }, // UTC+11 in Jan (southern-hemisphere summer)
      { timeZone: "Pacific/Auckland", expectation: "2024-01-01T01:00:00Z" }, // UTC+13 in Jan (southern-hemisphere summer)
    ] as Array<{ timeZone: string; expectation: string }>,
  };
  for (const { timeZone, expectation } of timeZoneTestSuite.testCases) {
    it(`successfully evaluates cron for timezone: ${timeZone}`, () => {
      // when
      const [timestamp] = CronJob.evaluateExpression({
        nowReference: timeZoneTestSuite.monday,
        expression: timeZoneTestSuite.expression,
        timeZone,
        amount: 1,
      });
      // then
      expect(timestamp.toString()).toEqual(expectation);
    });
  }

  it("returns a timestamp after the reference time", () => {
    // given
    // (13:30 UTC on a Monday = 14:30 Amsterdam; already past 14:00 Amsterdam)
    const nowReference = Temporal.Instant.from("2024-01-01T13:30:00Z");
    // when
    const [timestamp] = CronJob.evaluateExpression({
      nowReference,
      expression: "0 14 * * MON",
      timeZone: "Europe/Amsterdam",
      amount: 1,
    });
    // then
    // next 14:00 Amsterdam should be NEXT Monday (Jan 8), not today
    expect(Temporal.Instant.compare(timestamp, nowReference)).toBeGreaterThan(0);
    expect(timestamp.toString()).toEqual("2024-01-08T13:00:00Z");
  });

  it("returns timestamps in chronological order", () => {
    // given
    const amount = 1000;
    // when
    const timestamps = CronJob.evaluateExpression({
      expression: "30 15 * * SAT",
      timeZone: "UTC",
      amount,
    });
    // then
    expect(timestamps).toHaveLength(amount);
    for (let i = 1; i < timestamps.length; i++) {
      expect(Temporal.Instant.compare(timestamps[i - 1], timestamps[i])).toEqual(-1);
    }
  });

  it.each([
    "", // empty
    "potato", // ridiculous
    "* * * *", // too few fields
    "* * * * * * * * * *", // too many fields
    "60 * * * *", // minute out of range (0-59)
    "* 24 * * *", // hour out of range (0-23)
    "* * 32 * *", // day out of range (1-31)
    "* * * 13 *", // month out of range (1-12)
    "foo bar baz qux quux", // ridiculous
    "*/0 * * * *", // division by zero
    "1-60 * * * *", // range exceeds max
    "** * * * *", // invalid syntax
    "! @ # $ %", // ridiculous
  ])("rejects invalid cron expression: %s", async (expression) => {
    // when
    const action = () => CronJob.evaluateExpression({ expression, timeZone: "UTC", amount: 1 });
    // then
    expect(action).toThrow(/^Cron expression invalid/);
  });
});
