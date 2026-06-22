import { Yexception } from "yexception";

export class NotificationError {
  public static readonly NAME = "NotificationError";
  public static readonly policy_not_found = Yexception.field<{ id: string }>();
  public static readonly policy_already_exists = Yexception.field<{ id: string }>();

  static {
    Yexception.initialize(this);
  }
}
