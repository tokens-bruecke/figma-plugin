let quiet = false;

export const setQuiet = (value: boolean): void => {
  quiet = value;
};

// Progress logs go to stderr so stdout stays clean for piping (--stdout mode)
export const log = (...args: unknown[]): void => {
  if (!quiet) {
    console.error(...args);
  }
};
