import { Yexception } from "yexception";

export class ClientError {
  public static readonly NAME = "ClientError";
  public static readonly unknown = Yexception.field();

  static {
    Yexception.initialize(this);
  }
}
