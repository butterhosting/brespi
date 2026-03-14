import { Logger } from "@/Logger";
import { Temporal } from "@js-temporal/polyfill";
import { Cron } from "croner";

export class CronJob {
  private readonly log = new Logger(__filename);

  public static evaluateExpression({
    nowReference = Temporal.Now.instant(),
    expression,
    timeZone,
    amount,
  }: {
    nowReference?: Temporal.Instant;
    expression: string;
    timeZone: string;
    amount: number;
  }): Temporal.Instant[] {
    if (amount <= 0 || !Number.isInteger(amount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    let cron: Cron | undefined = undefined;
    try {
      cron = new Cron(expression, { timezone: timeZone });
      return cron.nextRuns(amount, new Date(nowReference.epochMilliseconds)).map((date) => {
        return Temporal.Instant.fromEpochMilliseconds(date.getTime());
      });
    } catch (e) {
      throw new Error(`Cron expression invalid: ${expression}`);
    } finally {
      cron?.stop();
    }
  }

  private timeoutToken?: NodeJS.Timeout;
  private readonly maxDelay = Math.pow(2, 31) - 1;

  public constructor(
    private readonly expression: string,
    private readonly timeZone: string,
    private readonly fn: () => unknown,
  ) {
    this.scheduleNextInvocation();
  }

  public stop() {
    clearTimeout(this.timeoutToken);
  }

  private scheduleNextInvocation() {
    const now = Temporal.Now.instant();
    const [next] = CronJob.evaluateExpression({
      nowReference: now,
      expression: this.expression,
      timeZone: this.timeZone,
      amount: 1,
    });
    const delay = next.since(now).total("milliseconds");
    this.timeoutToken = setTimeout(
      () => {
        if (delay <= this.maxDelay) {
          try {
            this.fn();
          } catch (e) {
            this.log.warn("Unhandled error in provided Cron function");
          }
        }
        this.scheduleNextInvocation();
      },
      Math.min(delay, this.maxDelay),
    );
  }
}
