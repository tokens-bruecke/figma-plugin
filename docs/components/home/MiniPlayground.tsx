import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColorMode, ExportOptions } from '../../../api';
import type { Result } from '../playground/convert';
import { collectTokens, highlight, toLines, tokenType, trim, type Line } from './json';

// Four variables are enough to show what the converter decides on its own:
// the color format, the DTCG structure, and the token type that scopes pick.
type Scope = 'ALL_SCOPES' | 'GAP' | 'CORNER_RADIUS' | 'FONT_SIZE' | 'FONT_WEIGHT' | 'OPACITY';

const SCOPES: [Scope, string][] = [
  ['ALL_SCOPES', 'All scopes'],
  ['GAP', 'Gap'],
  ['CORNER_RADIUS', 'Corner radius'],
  ['FONT_SIZE', 'Font size'],
  ['FONT_WEIGHT', 'Font weight'],
  ['OPACITY', 'Layer opacity'],
];
const scopeLabel = (scope: Scope) => SCOPES.find(([s]) => s === scope)![1];

// The second word hides on phones
const FORMATS: [ColorMode, string, string][] = [
  ['hex', 'HEX', ''],
  ['rgba-css', 'RGBA', ' CSS'],
  ['hsl-dtcg', 'HSL', ' DTCG'],
  ['oklch-dtcg', 'OKLCH', ' DTCG'],
];

const NUMBERS: { name: string; value: number; scope: Scope }[] = [
  { name: 'space/400', value: 16, scope: 'GAP' },
  { name: 'font/weight/bold', value: 700, scope: 'FONT_WEIGHT' },
  { name: 'opacity/disabled', value: 40, scope: 'OPACITY' },
];

const snapshot = (scopes: Scope[]) => {
  const variable = (name: string, resolvedType: string, value: unknown, scope: Scope) => ({
    id: `V:${name}`,
    name,
    variableCollectionId: 'C:core',
    resolvedType,
    description: '',
    scopes: [scope],
    remote: false,
    valuesByMode: { value },
  });
  const variables = [
    variable('color/focus', 'COLOR', { r: 13 / 255, g: 153 / 255, b: 1, a: 0.5 }, 'ALL_SCOPES'),
    // An alias stays a reference whatever the color format
    variable('color/focus-ring', 'COLOR', { type: 'VARIABLE_ALIAS', id: 'V:color/focus' }, 'ALL_SCOPES'),
    ...NUMBERS.map((n, i) => variable(n.name, 'FLOAT', n.value, scopes[i])),
  ];
  return JSON.stringify({
    variableCollections: [
      {
        id: 'C:core',
        name: 'Core',
        modes: [{ modeId: 'value', name: 'Value' }],
        defaultModeId: 'value',
        variableIds: variables.map((v) => v.id),
      },
    ],
    variables,
    paintStyles: [],
    textStyles: [],
    effectStyles: [],
    gridStyles: [],
  });
};

function ScopeMenu({ value, onChange }: { value: Scope; onChange: (scope: Scope) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div className="tb-mp-scope" ref={ref}>
      <button
        type="button"
        className="tb-mp-chip"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>{scopeLabel(value)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="tb-mp-menu" role="listbox" aria-label="Scope">
          {SCOPES.map(([scope, label]) => (
            <li key={scope}>
              <button
                type="button"
                role="option"
                aria-selected={scope === value}
                onClick={() => {
                  onChange(scope);
                  setOpen(false);
                }}
              >
                <span className="tb-mp-check" aria-hidden="true" />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MiniPlayground() {
  const [format, setFormat] = useState<ColorMode>('hex');
  const [dtcg, setDtcg] = useState(true);
  const [scopes, setScopes] = useState<Scope[]>(NUMBERS.map((n) => n.scope));
  const [lines, setLines] = useState<Line[]>([]);
  const [changed, setChanged] = useState<Map<string, string | undefined>>(new Map());
  const [stats, setStats] = useState<{ tokens: number; ms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previous = useRef<Map<string, unknown> | null>(null);
  const code = useRef<HTMLPreElement>(null);

  const options = useMemo<ExportOptions>(() => {
    const o: ExportOptions = {};
    if (format !== 'hex') o.colorMode = format;
    if (!dtcg) o.useDTCG = false;
    return o;
  }, [format, dtcg]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Loaded on demand, so the converter stays out of the page's first load
      const { convertSnapshot } = await import('../playground/convert');
      const result: Result = await convertSnapshot(snapshot(scopes), options);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const tree = trim(Object.values(result.files)[0] as never);
      const tokens = collectTokens(tree as never);
      const diff = new Map<string, string | undefined>();
      if (previous.current) {
        for (const [path, token] of tokens) {
          const before = previous.current.get(path);
          if (JSON.stringify(before) !== JSON.stringify(token)) {
            const was = tokenType(before as never);
            diff.set(path, was && was !== tokenType(token) ? was : undefined);
          }
        }
      }
      previous.current = tokens;
      setError(null);
      setLines(toLines(tree as never));
      setChanged(diff);
      setStats({ tokens: tokens.size, ms: result.ms });
    })();
    return () => {
      cancelled = true;
    };
  }, [scopes, options]);

  // The JSON scrolls inside its card, so bring the first change into view
  useEffect(() => {
    const pane = code.current;
    const first = pane?.querySelector<HTMLElement>('.tb-mp-line[data-changed]');
    if (!pane || !first) return;
    const top = first.offsetTop;
    const visible = top >= pane.scrollTop && top + first.offsetHeight <= pane.scrollTop + pane.clientHeight;
    if (!visible) pane.scrollTo({ top: Math.max(0, top - 44), behavior: 'smooth' });
  }, [changed]);

  // The highlight is a flash: it shows what the last click changed, then fades
  useEffect(() => {
    if (!changed.size) return;
    const timer = setTimeout(() => setChanged(new Map()), 2400);
    return () => clearTimeout(timer);
  }, [changed]);

  // The "was dimension" note goes on the type line of a changed token (or its
  // only line, when the token fits on one)
  const noteLine = new Set<number>();
  lines.forEach((line, i) => {
    if (!line.token || !changed.get(line.token)) return;
    const first = lines[i - 1]?.token !== line.token;
    const onlyLine = first && lines[i + 1]?.token !== line.token;
    if (onlyLine || /^\s*"\$?type":/.test(line.text)) noteLine.add(i);
  });

  return (
    <div className="tb-mp">
      <div className="tb-mp-bar">
        <div className="tb-mp-seg" role="radiogroup" aria-label="Color format">
          {FORMATS.map(([value, label, suffix]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={format === value}
              aria-label={label + suffix}
              onClick={() => setFormat(value)}
            >
              <span>
                {label}
                {suffix && <span className="tb-mp-suffix">{suffix}</span>}
              </span>
            </button>
          ))}
        </div>
        <label className="tb-mp-toggle">
          <input type="checkbox" checked={dtcg} onChange={(e) => setDtcg(e.target.checked)} />
          <span className="tb-mp-switch" aria-hidden="true" />
          <span>DTCG 2025.10</span>
        </label>
        <span className="tb-mp-stats">
          {stats ? `${stats.tokens} tokens · ${Math.max(1, Math.round(stats.ms))} ms` : 'Converting…'}
        </span>
      </div>

      <div className="tb-mp-body">
        <section className="tb-mp-card tb-mp-vars" aria-label="Figma variables">
          <div className="tb-mp-head">
            <span>Core</span>
            <span className="tb-mp-col-value">Value</span>
            <span className="tb-mp-col-scope">Scope</span>
          </div>
          <div className="tb-mp-row" data-changed={changed.has('Core.color.focus') ? '' : undefined}>
            <span className="tb-mp-name">
              color/focus <i>COLOR</i>
            </span>
            <span className="tb-mp-col-value">
              <span className="tb-mp-swatch" /> 50%
            </span>
            <span className="tb-mp-col-scope">
              <span className="tb-mp-chip is-static">
                <span>All scopes</span>
              </span>
            </span>
          </div>
          <div className="tb-mp-row" data-changed={changed.has('Core.color.focus-ring') ? '' : undefined}>
            <span className="tb-mp-name">
              color/focus-ring <i>COLOR</i>
            </span>
            <span className="tb-mp-col-value">
              <span className="tb-mp-alias" title="Alias of color/focus">
                → focus
              </span>
            </span>
            <span className="tb-mp-col-scope">
              <span className="tb-mp-chip is-static">
                <span>All scopes</span>
              </span>
            </span>
          </div>
          {NUMBERS.map((n, i) => (
            <div key={n.name} className="tb-mp-row" data-changed={changed.has(`Core.${n.name.replace(/\//g, '.')}`) ? '' : undefined}>
              <span className="tb-mp-name">
                {n.name} <i>FLOAT</i>
              </span>
              <span className="tb-mp-col-value">{n.value}</span>
              <span className="tb-mp-col-scope">
                <ScopeMenu
                  value={scopes[i]}
                  onChange={(scope) => setScopes(scopes.map((s, j) => (j === i ? scope : s)))}
                />
              </span>
            </div>
          ))}
          <div className="tb-mp-key">
            <strong>How a number variable gets its type</strong>
            <p>Figma has no opacity or font-weight type, so the scopes decide.</p>
            <dl>
              <dt>Only font weight</dt>
              <dd>fontWeight</dd>
              <dt>Only opacity</dt>
              <dd>number</dd>
              <dt>Anything else</dt>
              <dd>dimension</dd>
            </dl>
          </div>
        </section>

        <section className="tb-mp-card tb-mp-out" aria-label="Tokens JSON" aria-live="polite">
          <div className="tb-mp-head">
            <span>design.tokens.json</span>
            {changed.size ? (
              <span className="tb-mp-changed">
                {changed.size} {changed.size === 1 ? 'token' : 'tokens'} changed
              </span>
            ) : (
              <span className="tb-mp-dim">empty fields hidden</span>
            )}
          </div>
          {error ? (
            <p className="tb-mp-error">{error}</p>
          ) : (
            <pre className="tb-mp-code" ref={code}>
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="tb-mp-line"
                  data-changed={line.token && changed.has(line.token) ? '' : undefined}
                >
                  <code>
                    {highlight(line.text).map((p, j) =>
                      p.cls ? (
                        <span key={j} className={`tb-mp-${p.cls}`}>
                          {p.text}
                        </span>
                      ) : (
                        p.text
                      )
                    )}
                  </code>
                  {noteLine.has(i) && (
                    <span className="tb-mp-was">was {changed.get(line.token!)}</span>
                  )}
                </div>
              ))}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}
