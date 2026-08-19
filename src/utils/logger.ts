export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  private logMessage(
    level: LogLevel,
    method: 'log' | 'info' | 'warn' | 'error',
    message: string,
    ...args: unknown[]
  ): void {
    if (this.level <= level) {
      const timestamp = new Date().toISOString();
      console[method](`[${timestamp}] [${LogLevel[level]}] ${message}`, ...args);
    }
  }

  public debug(message: string, ...args: unknown[]): void {
    this.logMessage(LogLevel.DEBUG, 'log', message, ...args);
  }

  public info(message: string, ...args: unknown[]): void {
    this.logMessage(LogLevel.INFO, 'info', message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.logMessage(LogLevel.WARN, 'warn', message, ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    this.logMessage(LogLevel.ERROR, 'error', message, ...args);
  }
}

// Pre-configured instance for widespread use
// Defaults to INFO, can be overridden based on environment variables or config in a real app
export const logger = new Logger(
  import.meta.env?.MODE === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
);
