import { useEffect, useRef } from 'react';
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
  syntaxHighlighting,
} from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { tags } from '@lezer/highlight';

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
};

export default function CodeView({ value, onChange, label }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  change.current = onChange;

  useEffect(() => {
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
          }),
        ],
      }),
    });
    view.current = editor;
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

  return <div className="tb-pg-cm" ref={container} />;
}
