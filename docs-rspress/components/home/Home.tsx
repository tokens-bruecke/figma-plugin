// The home page: a pinned left column (pitch, actions, section index) and a
// right column that scrolls through the sections. On narrow screens the index
// moves into a sticky bar of chips at the top.
import { useEffect, useState, type ReactNode } from 'react';
import { withBase } from '@rspress/core/runtime';
import pkg from '@root/package.json';
import MiniPlayground from './MiniPlayground';
import './home.css';

const PLUGIN = 'https://www.figma.com/community/plugin/1254538877056388290';
const REPO = 'https://github.com/tokens-bruecke/figma-plugin';
const NPM = 'https://www.npmjs.com/package/tokens-bruecke';
const CHANGELOG = `${REPO}/blob/main/CHANGELOG.md`;
const COMMAND = 'npx tokens-bruecke@latest init';

const SECTIONS = [
  { id: 'try', label: 'Try it', short: 'Try it' },
  { id: 'plugin', label: 'Plugin', short: 'Plugin' },
  { id: 'cli', label: 'CLI', short: 'CLI' },
  { id: 'library', label: 'Library', short: 'Library' },
  { id: 'more', label: 'Everything else', short: 'More' },
];

const FEATURES = [
  ['Push to server', 'GitHub, GitLab, pull and merge requests, JSONBin, your endpoint', '/plugin/push-to-server'],
  ['Import', 'DTCG tokens back into Figma variables', '/getting-started/export-and-import#import-json--variables'],
  ['Styles', 'Typography, color, grids, shadows and blur', '/reference/styles'],
  ['Dev Mode', 'Developers export with your shared profile', '/plugin/dev-mode'],
  ['Aliases', 'Library variables and colors with opacity', '/reference/aliases'],
  ['Motion', 'Durations and easing curves', '/reference/types#motion-variables'],
];

const num = (i: number) => String(i + 1).padStart(2, '0');

function Logo() {
  return (
    <svg className="tb-logo" width="20" height="23" viewBox="0 0 42 48" aria-hidden="true">
      <path fill="currentColor" d="M20.785 0 41.57 12v24L20.785 48 0 36V12z" />
      <path fill="none" stroke="var(--tb-bg)" strokeWidth="4" strokeLinecap="round" d="M12.5 22.5c2 4.6 5.1 6.9 8.3 6.9s6.3-2.3 8.3-6.9" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyCommand() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="tb-cmd"
      onClick={async () => {
        await navigator.clipboard.writeText(COMMAND);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      aria-label={`Copy ${COMMAND}`}
    >
      <code>$ {COMMAND}</code>
      <span className="tb-cmd-hint">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

// Which section is in view, and how far through it the reader is
function useScrollSpy() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      const tops = SECTIONS.map((s) => document.getElementById(s.id)?.getBoundingClientRect());
      let index = 0;
      tops.forEach((rect, i) => {
        if (rect && rect.top <= line) index = i;
      });
      const rect = tops[index];
      setActive(index);
      setProgress(rect ? Math.min(1, Math.max(0, (line - rect.top) / rect.height)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return { active, progress };
}

function SectionHead({ index, title, children }: { index: number; title: string; children?: ReactNode }) {
  return (
    <header className="tb-sec-head">
      <span className="tb-eyebrow">
        {num(index)} — {SECTIONS[index].label}
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </header>
  );
}

export default function Home() {
  const { active, progress } = useScrollSpy();

  return (
    <div className="tb-home-e">
      {/* Phones: brand, install and the index as chips, pinned to the top */}
      <div className="tb-mbar">
        <div className="tb-mbar-row">
          <a className="tb-brand" href={withBase('/')}>
            <Logo />
            <span>TokensBrücke</span>
          </a>
          <a className="tb-btn tb-btn-sm" href={PLUGIN}>
            <span>Install</span>
          </a>
        </div>
        <nav className="tb-chips" aria-label="Sections">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === i ? 'true' : undefined}>
              <span className="tb-chip-num">{num(i)}</span>
              <span>{s.short}</span>
            </a>
          ))}
        </nav>
      </div>

      <aside className="tb-left">
        <div className="tb-left-top">
          <div className="tb-left-brand">
            <a className="tb-brand" href={withBase('/')}>
              <Logo />
              <span>TokensBrücke</span>
            </a>
            <a className="tb-version" href={CHANGELOG}>
              v{pkg.version}
            </a>
          </div>
          <h1>Figma variables, shipped as design tokens.</h1>
          <p className="tb-lede">
            Export variables and styles as DTCG 2025.10 tokens, push them to your repo, and import them back into
            Figma.
          </p>
          <div className="tb-actions">
            <a className="tb-btn" href={PLUGIN}>
              <span>Install the plugin</span>
            </a>
            <a className="tb-btn tb-btn-ghost" href={withBase('/getting-started/export-and-import')}>
              <span>Docs</span>
            </a>
          </div>
          <CopyCommand />
        </div>

        <nav className="tb-index" aria-label="Sections">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === i ? 'true' : undefined}>
              <span className="tb-index-num">{num(i)}</span>
              {s.label}
              {active === i && (
                <span className="tb-index-progress" aria-hidden="true">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </span>
              )}
            </a>
          ))}
        </nav>

        <footer className="tb-left-foot">
          <a href={REPO}>GitHub</a>
          <a href={NPM}>npm</a>
          <a href={CHANGELOG}>Changelog</a>
          <a href={withBase('/privacy')}>Privacy</a>
        </footer>
      </aside>

      <main className="tb-right">
        <div className="tb-topbar">
          <span className="tb-topbar-current">
            <span>{num(active)}</span>
            {SECTIONS[active].label}
          </span>
          <nav>
            <a href={withBase('/getting-started/export-and-import')}>Docs</a>
            <a href={withBase('/playground')}>Playground</a>
            <a href={CHANGELOG}>Changelog</a>
            <a href={REPO}>GitHub</a>
          </nav>
        </div>

        <section id="try" className="tb-sec">
          <SectionHead index={0} title="Same variables, your format.">
            Change the color format, the DTCG toggle or a scope, and only the affected tokens change. It runs the
            plugin's own converter in your browser; nothing is uploaded.
          </SectionHead>
          <MiniPlayground />
          <a className="tb-more" href={withBase('/playground')}>
            Open the full playground <Arrow />
          </a>
        </section>

        <section id="plugin" className="tb-sec tb-split">
          <SectionHead index={1} title="Export from Figma">
            Pick a color format, include styles, preview the JSON and push it to GitHub, GitLab or your own server.
            Works in Dev Mode too.
          </SectionHead>
          <div className="tb-shot">
            <img className="tb-light" src={withBase('/screenshots/overview-light.webp')} alt="The plugin with its settings and the JSON preview" loading="lazy" />
            <img className="tb-dark" src={withBase('/screenshots/overview-dark.webp')} alt="The plugin with its settings and the JSON preview" loading="lazy" />
          </div>
        </section>

        <section id="cli" className="tb-sec tb-split">
          <SectionHead index={2} title="Run it in CI">
            Export from the Figma REST API or a local snapshot. Pure JSON on stdout for scripts and agents.{' '}
            <a href={withBase('/cli/overview')}>CLI docs</a>
          </SectionHead>
          <pre className="tb-term">
            <code>
              {'$ npx tokens-bruecke@latest \\\n    --file-key $FIGMA_FILE \\\n    --output tokens/figma.json\n'}
              <span className="tb-term-ok">✨ Tokens successfully written to tokens/figma.json</span>
            </code>
          </pre>
        </section>

        <section id="library" className="tb-sec tb-split">
          <SectionHead index={3} title="Call it from your build">
            fetchTokens and convertTokens, with no child process and no files on disk.{' '}
            <a href={withBase('/library')}>Library docs</a>
          </SectionHead>
          <pre className="tb-codeblock">
            <code>
              {"import { fetchTokens } from 'tokens-bruecke/api';\n\nconst tokens = await fetchTokens({\n  fileKey: 'abc123',\n  personalAccessToken: myToken,\n});"}
            </code>
          </pre>
        </section>

        <section id="more" className="tb-sec">
          <SectionHead index={4} title="The rest of the pipeline." />
          <div className="tb-features">
            {FEATURES.map(([title, text, link]) => (
              <a key={title} href={withBase(link)}>
                <strong>{title}</strong>
                <span>{text}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="tb-closing">
          <h2>Ready when your variables are.</h2>
          <p>Free and open source under MIT. Nothing leaves Figma unless you push it.</p>
          <div className="tb-actions">
            <a className="tb-btn" href={PLUGIN}>
              <span>Install the plugin</span>
              <Arrow />
            </a>
            <CopyCommand />
          </div>
        </section>

        <footer className="tb-mfoot">
          <a href={REPO}>GitHub</a>
          <a href={NPM}>npm</a>
          <a href={CHANGELOG}>Changelog</a>
          <a href={withBase('/privacy')}>Privacy</a>
          <span>v{pkg.version}</span>
        </footer>
      </main>
    </div>
  );
}
