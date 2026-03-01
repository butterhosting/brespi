import { Prettify } from "@/helpers/Prettify";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { ScheduleClient } from "../clients/ScheduleClient";
import { useRegistry } from "../hooks/useRegistry";
import { Temporal } from "@js-temporal/polyfill";

type Props = {
  className?: string;
  expression: string;
  timezone: "utc" | "local";
};
export function CronEvaluations({ className, expression, timezone }: Props) {
  expression = expression.trim();
  const scheduleClient = useRegistry(ScheduleClient);
  const [evaluations, setEvaluations] = useState<Temporal.PlainDateTime[]>([]);

  useEffect(() => {
    if (!expression) {
      setEvaluations([]);
      return;
    }

    let cancelled = false;
    let fetching = false;

    const fetchBatch = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const result = await scheduleClient.nextCronEvaluations({ expression, amount: 100 });
        if (!cancelled) setEvaluations(result ?? []);
      } finally {
        fetching = false;
      }
    };

    setEvaluations([]);
    fetchBatch();

    const token = setInterval(() => {
      if (cancelled) return;
      const nowUtc = Temporal.Now.zonedDateTimeISO("UTC").toPlainDateTime();
      setEvaluations((current) => {
        const filtered = current.filter((e) => Temporal.PlainDateTime.compare(e, nowUtc) > 0);
        if (filtered.length > 0 && filtered.length < 8) {
          fetchBatch();
        }
        return filtered.length !== current.length ? filtered : current;
      });
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(token);
    };
  }, [expression]);

  const alterTimezone = (timestamp: Temporal.PlainDateTime): Temporal.PlainDateTime => {
    if (timezone === "local") {
      return timestamp
        .toZonedDateTime("UTC") // We know the received timestamp is already in UTC
        .withTimeZone(Temporal.Now.timeZoneId()) // Convert it to the browser timezone
        .toPlainDateTime(); // And then we strip the timezone information
    }
    return timestamp;
  };

  return (
    <div className={clsx(className, "flex flex-col items-start gap-1")}>
      {evaluations.slice(0, 3).map((nextCronEvaluation, index) => (
        <div
          key={nextCronEvaluation.toString()}
          className="truncate"
          style={{
            opacity: 1 - index * 0.2,
            fontSize: `${1 - index * 0.07}rem`,
          }}
        >
          {Prettify.timestamp(alterTimezone(nextCronEvaluation))}
        </div>
      ))}
    </div>
  );
}
