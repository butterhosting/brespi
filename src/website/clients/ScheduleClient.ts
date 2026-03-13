import { ScheduleError } from "@/errors/ScheduleError";
import { Schedule } from "@/models/Schedule";
import { OmitBetter } from "@/types/OmitBetter";
import { Temporal } from "@js-temporal/polyfill";
import { Yesttp } from "yesttp";

export class ScheduleClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async query(): Promise<Schedule[]> {
    const { body } = await this.yesttp.get("/schedules");
    return body.map(Schedule.parse);
  }

  public async create(schedule: OmitBetter<Schedule, "id" | "object">): Promise<Schedule> {
    const { body } = await this.yesttp.post(`/schedules`, {
      body: schedule,
    });
    return Schedule.parse(body);
  }

  public async update(id: string, schedule: OmitBetter<Schedule, "id" | "object">): Promise<Schedule> {
    const { body } = await this.yesttp.put(`/schedules/${id}`, {
      body: schedule,
    });
    return Schedule.parse(body);
  }

  public async delete(id: string): Promise<Schedule> {
    const { body } = await this.yesttp.delete(`/schedules/${id}`);
    return Schedule.parse(body);
  }

  public async nextCronEvaluations({
    expression,
    amount,
  }: {
    expression: string;
    amount: number;
  }): Promise<Temporal.Instant[] | undefined> {
    try {
      const { body } = await this.yesttp.post<string[]>("/schedules/evaluate-cron-expression", {
        body: { expression, amount },
      });
      return body.map((x) => Temporal.Instant.from(x));
    } catch (e) {
      if (ScheduleError.invalid_cron_expression.matches(e)) {
        return undefined;
      }
      throw e;
    }
  }
}
