import { Temporal } from "@js-temporal/polyfill";

export class Prettify {
  private static readonly monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  public static timestamp(instant: Temporal.Instant, timeZone: string): string {
    const wallClockTime = instant.toZonedDateTimeISO(timeZone).toPlainDateTime();

    const day = wallClockTime.day;
    const month = this.monthNames[wallClockTime.month - 1];
    const year = wallClockTime.year;

    const hours = String(wallClockTime.hour).padStart(2, "0");
    const minutes = String(wallClockTime.minute).padStart(2, "0");
    const seconds = String(wallClockTime.second).padStart(2, "0");

    return `${day} ${month} ${year} at ${hours}:${minutes}:${seconds}`;
  }

  public static duration(value: Temporal.Duration): string {
    const parts: string[] = [];
    const days = Math.floor(value.total("days"));
    const hours = Math.floor(value.total("hours")) % 24;
    const minutes = Math.floor(value.total("minutes")) % 60;
    const seconds = Math.floor(value.total("seconds")) % 60;
    const milliSeconds = Math.floor(value.total("milliseconds")) % 1000;

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    if ((seconds < 10 && milliSeconds > 0) || parts.length === 0) parts.push(`${milliSeconds}ms`);

    return parts.join(" ");
  }
}
