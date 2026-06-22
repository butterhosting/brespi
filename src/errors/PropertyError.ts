import { Yexception } from "yexception";

export class PropertyError {
  public static readonly NAME = "PropertyError";
  public static readonly variable_unresolved = Yexception.field<{ name: string }>();

  static {
    Yexception.initialize(this);
  }
}
