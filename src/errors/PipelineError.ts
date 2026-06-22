import { Yexception } from "yexception";

export class PipelineError {
  public static readonly NAME = "PipelineError";
  public static readonly not_found = Yexception.field<{ id: string }>();
  public static readonly already_exists = Yexception.field<{ id: string }>();
  public static readonly missing_starting_step = Yexception.field();
  public static readonly too_many_starting_steps = Yexception.field();
  public static readonly invalid_step_references = Yexception.field();

  static {
    Yexception.initialize(this);
  }
}
