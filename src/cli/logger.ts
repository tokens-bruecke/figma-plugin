let quiet = false;

export const setQuiet = (value: boolean): void => {
  quiet = value;
};

export type LogFn = (...args: unknown[]) => void;

// Progress logs go to stderr so stdout stays clean for piping (--stdout mode)
export const log: LogFn = (...args) => {
  if (!quiet) {
    console.error(...args);
  }
};

/** Logger for callers that must stay silent, such as the programmatic API. */
export const silentLog: LogFn = () => {};
