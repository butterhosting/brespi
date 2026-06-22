import { Yexception } from "yexception";

export class ScheduleError {
  public static readonly NAME = "ScheduleError";

  public static readonly not_found = Yexception.field<{ id: string }>();
  public static readonly already_exists = Yexception.field<{ id: string }>();
  public static readonly invalid_cron_expression = Yexception.field();
  public static readonly pipeline_not_found = Yexception.field();

  static {
    Yexception.initialize(this);
  }
}
