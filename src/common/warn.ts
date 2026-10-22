import { IResolver } from './resolver';

/**
 * Reports a warning of the export through the resolver, so the library API
 * can keep it out of the console. The plugin and the CLI log it with
 * `console.warn` (stderr for the CLI, so `--stdout` stays pipeable).
 */
export const warn = (
  resolver: Pick<IResolver, 'warn'> | undefined,
  message: string
) => {
  if (resolver?.warn) {
    resolver.warn(message);
  } else {
    console.warn(message);
  }
};
