import { Temporal } from "@js-temporal/polyfill";

export namespace Version {
  export function now(): string {
    return Temporal.Now.instant().toString({ fractionalSecondDigits: 3 });
  }

  export function compare(a: string, b: string): number {
    return Temporal.Instant.compare(Temporal.Instant.from(a), Temporal.Instant.from(b));
  }

  export function isValid(version: string): boolean {
    try {
      Temporal.Instant.from(version);
      return true;
    } catch {
      return false;
    }
  }
}
