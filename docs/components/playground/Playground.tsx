import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColorMode, ExportOptions } from '../../../api';
import { demoSnapshot } from '../../screenshots/demoSnapshot';
import CodeView from './CodeView';
import { convertSnapshot, type Result } from './convert';
import './playground.css';

const SAMPLE = JSON.stringify(demoSnapshot, null, 2);

const COLOR_MODES: [ColorMode, string][] = [
  ['hex', 'HEX'],
  ['rgba-css', 'RGBA CSS'],
  ['rgba-object', 'RGBA Object'],
  ['srgb-dtcg', 'sRGB DTCG'],
  ['hsla-css', 'HSLA CSS'],
  ['hsla-object', 'HSLA Object'],
  ['hsl-dtcg', 'HSL DTCG'],
  ['oklch-dtcg', 'OKLCH DTCG'],
];

type Toggle = { key: string; label: string; doc: string };

const TOGGLES: Toggle[] = [
  {
    key: 'useDTCG',
    label: 'DTCG 2025.10 format',
    doc: '/plugin/settings#dtcg-202510-format',
  },
  { key: 'text', label: 'Typography styles', doc: '/reference/styles' },
  { key: 'colors', label: 'Color styles', doc: '/reference/styles' },
  { key: 'effects', label: 'Effect styles', doc: '/reference/styles' },
  {
    key: 'includeScopes',
    label: 'Variable scopes',
    doc: '/plugin/advanced-settings#include-variable-scopes',
  },
  {
    key: 'includeFigmaMetaData',
    label: 'Figma metadata',
    doc: '/plugin/advanced-settings#include-figma-metadata',
  },
  {
    key: 'splitByCollection',
    label: 'Split by collection',
    doc: '/plugin/advanced-settings#split-collections-into-separate-files',
  },
  {
    key: 'splitByMode',
    label: 'Split by mode',
    doc: '/plugin/advanced-settings#split-modes-into-separate-files',
  },
  { key: 'omitCreatedAt', label: 'Omit created-at', doc: '/cli/options' },
];

const STYLE_KEYS = ['text', 'colors', 'effects'] as const;

type State = { colorMode: ColorMode } & Record<string, boolean | ColorMode>;

const INITIAL: State = {
  colorMode: 'hex',
  useDTCG: true,
  text: true,
  colors: true,
  effects: true,
  includeScopes: false,
  includeFigmaMetaData: false,
  splitByCollection: false,
  splitByMode: false,
  omitCreatedAt: true,
};

// Only what differs from the defaults, so it reads like a config file
const toOptions = (state: State): ExportOptions => {
  const options: ExportOptions = {};
  if (state.colorMode !== 'hex') options.colorMode = state.colorMode;
  for (const { key } of TOGGLES) {
    if ((STYLE_KEYS as readonly string[]).includes(key)) continue;
    const on = Boolean(state[key]);
    if (on !== (key === 'useDTCG')) options[key] = on;
  }
  const styles = STYLE_KEYS.filter((key) => state[key]);
  if (styles.length) {
    options.includedStyles = Object.fromEntries(
      styles.map((key) => [key, { isIncluded: true }])
    );
  }
  return options;
};

const countTokens = (node: unknown): number => {
  if (!node || typeof node !== 'object') return 0;
  if ('$value' in node || 'value' in node) return 1;
  return Object.entries(node).reduce(
    (sum, [key, child]) =>
      key.startsWith('$') ? sum : sum + countTokens(child),
    0
  );
};

const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} kB`;

const download = (name: string, text: string) => {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/\//g, '-');
  link.click();
  URL.revokeObjectURL(url);
};

export default function Playground() {
  const [input, setInput] = useState(SAMPLE);
  const [state, setState] = useState<State>(INITIAL);
  const [result, setResult] = useState<Result | null>(null);
  const [active, setActive] = useState(0);
  const [view, setView] = useState<'tokens' | 'config'>('tokens');
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // The headers hold each pane's Collapse all and Expand all
  const [inputTools, setInputTools] = useState<HTMLSpanElement | null>(null);
  const [outputTools, setOutputTools] = useState<HTMLSpanElement | null>(null);

  const options = useMemo(() => toOptions(state), [state]);

  // Converts as you type, a moment after the last key
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const next = await convertSnapshot(input, options);
      if (!cancelled) setResult(next);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, options]);

  const files = result?.ok ? Object.entries(result.files) : [];
  const current = files[Math.min(active, files.length - 1)];
  const output = current ? JSON.stringify(current[1], null, 2) : '';
  const config = JSON.stringify(
    {
      $schema:
        'https://raw.githubusercontent.com/tokens-bruecke/figma-plugin/main/schemas/cli-options.schema.json',
      ...options,
    },
    null,
    2
  );
  const shown = view === 'config' ? config : output;
  const tokens = useMemo(
    () => files.reduce((sum, [, tree]) => sum + countTokens(tree), 0),
    [result]
  );

  const set = (key: string, value: boolean | ColorMode) =>
    setState((previous) => ({ ...previous, [key]: value }));

  const openFile = async (file?: File) => {
    if (file) setInput(await file.text());
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="tb-pg">
      <div className="tb-pg-options">
        <label className="tb-pg-select">
          <span>Color mode</span>
          <select
            value={state.colorMode}
            onChange={(e) => set('colorMode', e.target.value as ColorMode)}
          >
            {COLOR_MODES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {TOGGLES.map(({ key, label, doc }) => (
          <label key={key} className="tb-pg-toggle" title={`See ${doc}`}>
            <input
              type="checkbox"
              checked={Boolean(state[key])}
              onChange={(e) => set(key, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="tb-pg-panes">
        <section
          className="tb-pg-pane"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            openFile(e.dataTransfer.files[0]);
          }}
        >
          <header>
            <strong>Snapshot</strong>
            <span ref={setInputTools} />
            <span className="tb-pg-spacer" />
            <button type="button" onClick={() => fileInput.current?.click()}>
              Open file…
            </button>
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              disabled={input === SAMPLE}
            >
              Reset sample
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => openFile(e.target.files?.[0])}
            />
          </header>
          <CodeView
            value={input}
            onChange={setInput}
            label="Snapshot JSON"
            toolsTarget={inputTools}
          />
        </section>

        <section className="tb-pg-pane">
          <header>
            <div className="tb-pg-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'tokens'}
                onClick={() => setView('tokens')}
              >
                Tokens
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'config'}
                onClick={() => setView('config')}
              >
                CLI config
              </button>
            </div>
            <span ref={setOutputTools} />
            <span className="tb-pg-spacer" />
            <button type="button" onClick={copy} disabled={!shown}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              disabled={!shown}
              onClick={() =>
                download(
                  view === 'config' ? 'tokens-bruecke.config.json' : current[0],
                  shown
                )
              }
            >
              Download
            </button>
          </header>

          {view === 'tokens' && files.length > 1 && (
            <div className="tb-pg-files">
              {files.map(([name], index) => (
                <button
                  type="button"
                  key={name}
                  aria-pressed={current?.[0] === name}
                  onClick={() => setActive(index)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {result && !result.ok ? (
            <div className="tb-pg-error" role="alert">
              {result.error}
            </div>
          ) : (
            <CodeView
              key={view === 'config' ? 'config' : current?.[0]}
              value={shown}
              label={view === 'config' ? 'CLI config' : 'Tokens JSON'}
              toolsTarget={outputTools}
            />
          )}

          <footer>
            {result?.ok ? (
              view === 'config' ? (
                <span>
                  Run{' '}
                  <code>
                    npx tokens-bruecke@latest -c tokens-bruecke.config.json
                    --input snapshot.json
                  </code>
                </span>
              ) : (
                <>
                  <span>{tokens} tokens</span>
                  <span>
                    {files.length} {files.length === 1 ? 'file' : 'files'}
                  </span>
                  <span>{formatBytes(new Blob([output]).size)}</span>
                  <span>{result.ms.toFixed(0)} ms</span>
                  {result.warnings.length > 0 && (
                    <details className="tb-pg-warnings">
                      <summary>
                        {result.warnings.length}{' '}
                        {result.warnings.length === 1 ? 'warning' : 'warnings'}
                      </summary>
                      <ul>
                        {result.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )
            ) : (
              <span>Converting…</span>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}
