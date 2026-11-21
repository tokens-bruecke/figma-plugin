// Pretty-prints a token tree line by line, remembering which token each line
// belongs to, so the mini playground can highlight only the tokens that changed.

export type Line = { text: string; token?: string };

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const isPrimitive = (value: Json) => value === null || typeof value !== 'object';
const isObject = (value: Json): value is { [key: string]: Json } =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const isToken = (value: Json) =>
  isObject(value) && ('$value' in value || ('value' in value && 'type' in value));

const inline = (value: Json): string => {
  if (isPrimitive(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`;
  const entries = Object.entries(value);
  if (!entries.length) return '{}';
  return `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`).join(', ')} }`;
};

// Short leaves stay on one line: { "value": 16, "unit": "px" }, [0.67, 0.18, 249.2]
const MAX_LINE = 50;
const fitsOnOneLine = (value: Json, prefix: string) => {
  if (isPrimitive(value)) return true;
  const flat = Array.isArray(value)
    ? value.every(isPrimitive)
    : Object.values(value).every(
        (v) => isPrimitive(v) || (Array.isArray(v) && v.every(isPrimitive))
      );
  return flat && prefix.length + inline(value).length + 1 <= MAX_LINE;
};

export function toLines(tree: Json): Line[] {
  const lines: Line[] = [];
  const walk = (
    value: Json,
    depth: number,
    key: string | null,
    last: boolean,
    path: string[],
    token?: string
  ) => {
    const pad = '  '.repeat(depth);
    const prefix = `${pad}${key === null ? '' : `${JSON.stringify(key)}: `}`;
    const comma = last ? '' : ',';
    const own = token ?? (isToken(value) ? path.join('.') : undefined);
    if (fitsOnOneLine(value, prefix)) {
      lines.push({ text: `${prefix}${inline(value)}${comma}`, token: own });
      return;
    }
    const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
    lines.push({ text: `${prefix}${open}`, token: own });
    const entries: [string | null, Json][] = Array.isArray(value)
      ? value.map((v) => [null, v])
      : Object.entries(value as { [key: string]: Json });
    entries.forEach(([k, v], i) =>
      walk(v, depth + 1, k, i === entries.length - 1, k === null ? path : [...path, k], own)
    );
    lines.push({ text: `${pad}${close}${comma}`, token: own });
  };
  walk(tree, 0, null, true, []);
  return lines;
}

// Every token by its dot path, for comparing two outputs
export function collectTokens(tree: Json, path: string[] = [], out = new Map<string, Json>()) {
  if (isToken(tree)) out.set(path.join('.'), tree);
  else if (isObject(tree))
    for (const [k, v] of Object.entries(tree))
      if (!k.startsWith('$')) collectTokens(v, [...path, k], out);
  return out;
}

export const tokenType = (token: Json | undefined) =>
  isObject(token) ? ((token.$type ?? token.type) as string | undefined) : undefined;

// Drops what is empty in this tiny sample (descriptions, modes of a one-mode
// collection) and the file's metadata, so the interesting part fits on screen
export function trim(tree: Json): Json {
  if (!isObject(tree)) return tree;
  const out: { [key: string]: Json } = {};
  for (const [k, v] of Object.entries(tree)) {
    if (k === 'tokens-bruecke-meta') continue;
    if ((k === '$description' || k === 'description') && v === '') continue;
    if (k === 'mode' && isObject(v) && !Object.keys(v).length) continue;
    const next = trim(v);
    if (k === '$extensions' && isObject(next) && !Object.keys(next).length) continue;
    out[k] = next;
  }
  return out;
}

export type Piece = { text: string; cls?: string };

// Keys, $-keys, strings, numbers and {references} apart; enough for a glance
export function highlight(text: string): Piece[] {
  const pieces: Piece[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) pieces.push({ text: text.slice(last, m.index) });
    const [match, string, colon, keyword, number] = m;
    if (string && colon) {
      pieces.push({ text: string, cls: string.startsWith('"$') ? 'k2' : 'k' });
      pieces.push({ text: colon });
    } else if (string) {
      pieces.push({ text: string, cls: /^"\{[^}]+\}"$/.test(string) ? 'r' : 's' });
    } else if (keyword) pieces.push({ text: keyword, cls: 'n' });
    else if (number) pieces.push({ text: number, cls: 'n' });
    else pieces.push({ text: match });
    last = m.index + match.length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}
