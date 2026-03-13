import { Prettify } from "@/helpers/Prettify";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { ScheduleClient } from "../clients/ScheduleClient";
import { useRegistry } from "../hooks/useRegistry";
import { Temporal } from "@js-temporal/polyfill";

type Props = {
  className?: string;
  expression: string;
};
export function CronEvaluations({ className, expression }: Props) {
  expression = expression.trim();
  const scheduleClient = useRegistry(ScheduleClient);
  const [evaluations, setEvaluations] = useState<Temporal.Instant[]>([]);
  const { O_BRESPI_TIMEZONE: timeZone } = useRegistry("env");

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
      const now = Temporal.Now.instant();
      setEvaluations((current) => {
        const filtered = current.filter((i) => Temporal.Instant.compare(i, now) > 0);
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
          {Prettify.timestamp(nextCronEvaluation, timeZone)}
        </div>
      ))}
    </div>
  );
}
