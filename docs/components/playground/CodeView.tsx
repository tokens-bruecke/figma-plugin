import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditorState } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  keymap,
  lineNumbers,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import {
  HighlightStyle,
  bracketMatching,
  codeFolding,
  foldGutter,
  foldKeymap,
  foldedRanges,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
// The plugin's own fold rules, so Collapse all leaves the same index
import {
  collapseAllEffects,
  expandAllEffects,
  getFoldStatus,
} from '@app/components/JsonViewer/folding';

// Classes rather than colors, so the light and dark palettes stay in CSS
const highlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, class: 'tb-k' },
  { tag: tags.string, class: 'tb-s' },
  { tag: tags.number, class: 'tb-n' },
  { tag: [tags.bool, tags.null], class: 'tb-b' },
]);

// "{Core.color.focus}" is a string to the JSON grammar; it reads as a link
const references = ViewPlugin.fromClass(
  class {
    decorator = new MatchDecorator({
      regexp: /"\{[^"{}]+\}"/g,
      decoration: Decoration.mark({ class: 'tb-r' }),
    });
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.decorator.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.decorations = this.decorator.updateDeco(update, this.decorations);
    }
  },
  { decorations: (plugin) => plugin.decorations }
);

/**
 * Replaces only what differs, so folds before and after the change stay
 * folded when the output updates
 */
const changesTo = (current: string, next: string) => {
  let start = 0;
  const max = Math.min(current.length, next.length);
  while (start < max && current[start] === next[start]) start++;
  let end = 0;
  while (
    end < max - start &&
    current[current.length - 1 - end] === next[next.length - 1 - end]
  )
    end++;
  return {
    from: start,
    to: current.length - end,
    insert: next.slice(start, next.length - end),
  };
};

type Props = {
  value: string;
  onChange?: (value: string) => void;
  label: string;
  /** Where Collapse all and Expand all render, the pane's header */
  toolsTarget?: HTMLElement | null;
};

export default function CodeView({ value, onChange, label, toolsTarget }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  change.current = onChange;
  const [status, setStatus] = useState({ canCollapse: false, canExpand: false });

  useEffect(() => {
    const sync = (state: EditorState) => {
      const next = getFoldStatus(state);
      setStatus((prev) =>
        prev.canCollapse === next.canCollapse && prev.canExpand === next.canExpand
          ? prev
          : next
      );
    };
    const editor = new EditorView({
      parent: container.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          json(),
          lineNumbers(),
          codeFolding({ placeholderText: '…' }),
          foldGutter(),
          bracketMatching(),
          history(),
          search({ top: true }),
          highlightSelectionMatches(),
          keymap.of([...searchKeymap, ...foldKeymap, ...historyKeymap, ...defaultKeymap]),
          syntaxHighlighting(highlightStyle),
          references,
          // Read-only but still focusable, so the output can be searched and
          // folded from the keyboard
          EditorState.readOnly.of(!onChange),
          EditorView.contentAttributes.of({ 'aria-label': label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) change.current?.(update.state.doc.toString());
            // Large files may still be parsing when first shown
            if (
              update.docChanged ||
              foldedRanges(update.state) !== foldedRanges(update.startState) ||
              syntaxTree(update.state) !== syntaxTree(update.startState)
            )
              sync(update.state);
          }),
        ],
      }),
    });
    view.current = editor;
    sync(editor.state);
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);

  // A new value from outside: Reset sample, an opened file, new output
  useEffect(() => {
    const editor = view.current;
    const current = editor?.state.doc.toString();
    if (!editor || current === value) return;
    editor.dispatch({ changes: changesTo(current!, value) });
  }, [value]);

  const collapseAll = () => {
    const editor = view.current;
    if (!editor) return;
    editor.dispatch({ effects: collapseAllEffects(editor.state) });
    editor.scrollDOM.scrollTop = 0;
  };

  const expandAll = () => {
    const editor = view.current;
    if (editor) editor.dispatch({ effects: expandAllEffects(editor.state) });
  };

  const tools = (
    <span className="tb-pg-folds">
      <button
        type="button"
        onClick={collapseAll}
        disabled={!status.canCollapse}
        title="Collapse all"
        aria-label="Collapse all"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m5 2.5 3 3 3-3M5 13.5l3-3 3 3" />
        </svg>
      </button>
      <button
        type="button"
        onClick={expandAll}
        disabled={!status.canExpand}
        title="Expand all"
        aria-label="Expand all"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m5 5.5 3-3 3 3M5 10.5l3 3 3-3" />
        </svg>
      </button>
    </span>
  );

  return (
    <>
      {/* The Markdown render for llms.txt has no real DOM to portal into */}
      {typeof HTMLElement !== 'undefined' &&
        toolsTarget instanceof HTMLElement &&
        createPortal(tools, toolsTarget)}
      <div className="tb-pg-cm" ref={container} />
    </>
  );
}
