import React from 'react';

import { EditorState, EditorSelection, StateEffect } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view';
import {
  foldGutter,
  codeFolding,
  foldKeymap,
  foldedRanges,
  unfoldEffect,
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
} from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import {
  search,
  openSearchPanel,
  setSearchQuery,
  SearchQuery,
  highlightSelectionMatches,
} from '@codemirror/search';
import { defaultKeymap } from '@codemirror/commands';
import { tags } from '@lezer/highlight';

import { Icon } from 'react-figma-ui/ui';

import styles from './styles.module.scss';

interface JsonViewerProps {
  code: string;
}

const figmaHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--figma-color-text)' },
  { tag: tags.string, color: 'var(--figma-color-text-success)' },
  { tag: tags.number, color: 'var(--figma-color-text-brand)' },
  { tag: tags.bool, color: 'var(--figma-color-text-danger)' },
  { tag: tags.null, color: 'var(--figma-color-text-danger)' },
  {
    tag: [tags.punctuation, tags.separator, tags.bracket],
    color: 'var(--figma-color-text-secondary)',
  },
]);

const figmaTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
    color: 'var(--figma-color-text)',
    fontSize: '11px',
  },
  '.cm-scroller': {
    fontFamily:
      "'SF Mono', SFMono-Regular, ui-monospace, Menlo, Monaco, monospace",
    lineHeight: '1.6',
    paddingBottom: '60px',
  },
  '.cm-content': {
    caretColor: 'var(--figma-color-text)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--figma-color-bg-secondary)',
    color: 'var(--figma-color-text-tertiary)',
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--figma-color-text)',
  },
  '.cm-foldGutter .cm-gutterElement': {
    cursor: 'pointer',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--figma-color-bg-brand-tertiary)',
    border: 'none',
    color: 'var(--figma-color-text)',
    borderRadius: '4px',
    padding: '0 6px',
    margin: '0 4px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection':
    {
      backgroundColor: 'var(--figma-color-bg-onselected) !important',
    },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--figma-color-bg-onselected-secondary)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'var(--figma-color-bg-warning-tertiary)',
    outline: '1px solid var(--figma-color-border-warning-strong)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--figma-color-bg-warning)',
  },
  // the search panel is only used to activate match highlighting,
  // the actual UI is a custom floating input
  '.cm-panels': {
    display: 'none',
  },
});

// an empty, hidden panel — keeps the search state active
// so match decorations are rendered
const hiddenSearchPanel = () => {
  const dom = document.createElement('div');
  return { dom };
};

// react-figma-ui has no close/cross icon,
// so it's drawn in the same style as the Figma icon set
const CloseIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
      stroke="currentColor"
      strokeLinecap="round"
    />
  </svg>
);

const getMatches = (state: EditorState, query: string) => {
  const matches: { from: number; to: number }[] = [];

  if (!query) {
    return matches;
  }

  const cursor = new SearchQuery({
    search: query,
    caseSensitive: false,
  }).getCursor(state);

  let match = cursor.next();
  while (!match.done) {
    matches.push(match.value);
    match = cursor.next();
  }

  return matches;
};

export const JsonViewer = ({ code }: JsonViewerProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const viewRef = React.useRef<EditorView | null>(null);

  const [query, setQuery] = React.useState<string>('');
  const [matchCount, setMatchCount] = React.useState<number>(0);
  const [currentMatch, setCurrentMatch] = React.useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = React.useState<boolean>(false);

  const openSearch = () => {
    setIsSearchOpen(true);
    // wait for the input to be rendered
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const closeSearch = () => {
    setQuery('');
    setIsSearchOpen(false);
  };

  React.useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const state = EditorState.create({
      doc: code,
      extensions: [
        json(),
        lineNumbers(),
        codeFolding(),
        foldGutter(),
        bracketMatching(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        search({ createPanel: hiddenSearchPanel }),
        highlightSelectionMatches(),
        keymap.of([
          {
            key: 'Mod-f',
            run: () => {
              openSearch();
              return true;
            },
          },
          ...foldKeymap,
          ...defaultKeymap,
        ]),
        EditorState.readOnly.of(true),
        figmaTheme,
        syntaxHighlighting(figmaHighlightStyle),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    // activate the (hidden) search panel so matches get highlighted
    openSearchPanel(view);

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // update the document when the code prop changes
  React.useEffect(() => {
    const view = viewRef.current;

    if (!view || view.state.doc.toString() === code) {
      return;
    }

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: code },
    });
  }, [code]);

  // update the search query when the input changes
  React.useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const searchQuery = new SearchQuery({
      search: query,
      caseSensitive: false,
    });

    view.dispatch({ effects: setSearchQuery.of(searchQuery) });

    setMatchCount(getMatches(view.state, query).length);
    setCurrentMatch(0);
  }, [query, code]);

  // manual match navigation: selects the match, unfolds it if needed
  // and scrolls it to the vertical center
  const goToMatch = (direction: 1 | -1) => {
    const view = viewRef.current;

    if (!view || !query) {
      return;
    }

    const { state } = view;
    const matches = getMatches(state, query);

    if (matches.length === 0) {
      return;
    }

    // find the target match relative to the current selection (with wrapping)
    const selection = state.selection.main;

    let targetIndex: number;
    if (direction === 1) {
      const next = matches.findIndex((range) => range.from > selection.from);
      targetIndex = next === -1 ? 0 : next;
    } else {
      const prevCandidates = matches.filter(
        (range) => range.from < selection.from
      );
      targetIndex =
        prevCandidates.length > 0
          ? prevCandidates.length - 1
          : matches.length - 1;
    }

    const target = matches[targetIndex];
    setCurrentMatch(targetIndex + 1);

    // unfold any folded ranges that hide the target
    const unfoldEffects: StateEffect<{ from: number; to: number }>[] = [];
    foldedRanges(state).between(0, state.doc.length, (from, to) => {
      if (from < target.to && to > target.from) {
        unfoldEffects.push(unfoldEffect.of({ from, to }));
      }
    });

    view.dispatch({
      selection: EditorSelection.single(target.from, target.to),
      effects: unfoldEffects,
      userEvent: 'select.search',
    });

    // scroll the match to the vertical center by setting scrollTop
    // directly — CodeMirror's scrollIntoView effect proved unreliable
    // here. Runs twice, because with long documents the first pass
    // works with estimated line heights
    const centerMatch = () => {
      view.requestMeasure({
        read: () => view.lineBlockAt(target.from),
        write: (block) => {
          const scroller = view.scrollDOM;
          scroller.scrollTop =
            block.top + block.height / 2 - scroller.clientHeight / 2;
        },
      });
    };

    centerMatch();
    requestAnimationFrame(centerMatch);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      goToMatch(event.shiftKey ? -1 : 1);
    }

    if (event.key === 'Escape') {
      closeSearch();
    }
  };

  const handleInputBlur = () => {
    // collapse back to the icon if the search is empty
    if (!query) {
      setIsSearchOpen(false);
    }
  };

  return (
    <div className={styles.jsonViewer}>
      <div className={styles.searchBar}>
        {isSearchOpen ? (
          <>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              spellCheck={false}
            />

            {query && (
              <span className={styles.matchCount}>
                {currentMatch > 0
                  ? `${currentMatch}/${matchCount}`
                  : matchCount}
              </span>
            )}

            <button
              onClick={() => goToMatch(-1)}
              disabled={matchCount === 0}
              title="Previous match (Shift+Enter)"
            >
              <Icon name="arrow-up" size="16" />
            </button>
            <button
              onClick={() => goToMatch(1)}
              disabled={matchCount === 0}
              title="Next match (Enter)"
            >
              <Icon name="arrow-down" size="16" />
            </button>
            <button onClick={closeSearch} title="Close search (Esc)">
              <CloseIcon />
            </button>
          </>
        ) : (
          <button
            className={styles.searchTrigger}
            onClick={openSearch}
            title="Search (⌘F)"
          >
            <Icon name="search" size="16" />
          </button>
        )}
      </div>

      <div ref={containerRef} className={styles.editor} />
    </div>
  );
};
