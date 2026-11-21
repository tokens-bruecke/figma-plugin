// The browser half of `convertTokens` from src/api: the same option defaults,
// snapshot validation and converter as the CLI and the library, without the
// REST API client (figma-api and axios), which a snapshot doesn't need.
import { getTokens } from '@common/export';
import { FileResolver, validateSnapshot } from '@cli/fileResolver';
import { resolveExportOptions } from '@cli/options';
import { silentLog } from '@cli/logger';
import type { ExportOptions } from '../../../api';

export type Result =
  | { ok: true; files: Record<string, unknown>; warnings: string[]; ms: number }
  | { ok: false; error: string };

export async function convertSnapshot(
  json: string,
  options: ExportOptions
): Promise<Result> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return {
      ok: false,
      error: `The snapshot is not valid JSON: ${error.message}`,
    };
  }

  const warnings: string[] = [];
  const started = performance.now();
  try {
    const settings = resolveExportOptions(options, {});
    const resolver = new FileResolver(
      validateSnapshot(parsed, 'The snapshot'),
      silentLog,
      (message) => warnings.push(message)
    );
    const tokens = (await getTokens(resolver, settings)) as Record<
      string,
      unknown
    >;
    const split = options.splitByCollection || options.splitByMode;
    return {
      ok: true,
      // One file, or one per collection (and mode), as the CLI would write them
      files: split
        ? Object.fromEntries(
            Object.entries(tokens).map(([key, tree]) => [
              `${key}.tokens.json`,
              { [key.split('/')[0]]: tree },
            ])
          )
        : { 'design.tokens.json': tokens },
      warnings,
      ms: performance.now() - started,
    };
  } catch (error) {
    return { ok: false, error: error?.message ?? String(error) };
  }
}
