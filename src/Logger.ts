import { Temporal } from "@js-temporal/polyfill";
import { basename } from "path";
import { Env } from "./Env";
import { LogLevel } from "./models/LogLevel";

export class Logger {
  private static globalSetting: LogLevel;
  private static readonly emojis: Record<LogLevel, string> = {
    [LogLevel.debug]: "🐞",
    [LogLevel.info]: "ℹ️",
    [LogLevel.warn]: "⚠️",
    [LogLevel.error]: "❌",
  };

  public static initialize(env: Env.Private) {
    this.globalSetting = env.X_BRESPI_LOGLEVEL;
  }

  private readonly filename: string;

  public constructor(file: string) {
    if (!Logger.globalSetting) {
      throw new Error("Logger must be initialized first");
    }
    this.filename = basename(file);
  }

  public debug = (...args: unknown[]) => {
    this.log(LogLevel.debug, ...args);
  };

  public info = (...args: unknown[]) => {
    this.log(LogLevel.info, ...args);
  };

  public warn = (...args: unknown[]) => {
    this.log(LogLevel.warn, ...args);
  };

  public error = (...args: unknown[]) => {
    this.log(LogLevel.error, ...args);
  };

  private log = (level: LogLevel, ...args: unknown[]) => {
    if (this.shouldLog(level)) {
      const timestamp = Temporal.Now.plainDateTimeISO().toString({ smallestUnit: "second" }).replace("T", " ");
      const prefix = `${timestamp} [${level.toUpperCase()}] ${Logger.emojis[level]} ${this.filename} |`;
      console[level].call(console, prefix, ...args);
    }
  };

  private shouldLog = (level: LogLevel): boolean => {
    switch (Logger.globalSetting) {
      case LogLevel.debug:
        return true;
      case LogLevel.info:
        return [LogLevel.info, LogLevel.warn, LogLevel.error].includes(level);
      case LogLevel.warn:
        return [LogLevel.warn, LogLevel.error].includes(level);
      case LogLevel.error:
        return [LogLevel.error].includes(level);
    }
  };
}
