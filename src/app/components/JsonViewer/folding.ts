import { EditorState } from '@codemirror/state';
import {
  ensureSyntaxTree,
  foldable,
  foldedRanges,
  foldEffect,
  unfoldEffect,
} from '@codemirror/language';

type Range = { from: number; to: number };

// How long the parser may run to finish the tree of a large file
const PARSE_TIMEOUT_MS = 500;

/**
 * The fold ranges of the values of the root object's properties: the
 * collections, or "Collection/Mode" keys when split by mode. Folding the
 * root itself would leave a single `{…}` line, so it stays open and the
 * result reads like an index.
 */
export const getTopLevelFoldRanges = (state: EditorState): Range[] => {
  const tree = ensureSyntaxTree(state, state.doc.length, PARSE_TIMEOUT_MS);
  const root = tree?.topNode.getChild('Object');

  if (!root) {
    return [];
  }

  return root.getChildren('Property').flatMap((property) => {
    const value = property.lastChild;

    if (!value || (value.name !== 'Object' && value.name !== 'Array')) {
      return [];
    }

    // the language's own fold range of the line the value opens on
    const line = state.doc.lineAt(value.from);
    const range = foldable(state, line.from, line.to);

    return range ? [range] : [];
  });
};

const getFoldedRanges = (state: EditorState) => {
  const ranges: Range[] = [];

  foldedRanges(state).between(0, state.doc.length, (from, to) => {
    ranges.push({ from, to });
  });

  return ranges;
};

const unfoldAllEffects = (state: EditorState) =>
  getFoldedRanges(state).map((range) => unfoldEffect.of(range));

/**
 * Whether Collapse all and Expand all would change anything. Collapse all
 * would not when the index already shows: every top-level value folded and
 * nothing else. Expand all would not when nothing is folded.
 */
export const getFoldStatus = (state: EditorState) => {
  const folded = getFoldedRanges(state);
  const topLevel = getTopLevelFoldRanges(state);

  // both lists are in document order
  const isIndexShown =
    folded.length === topLevel.length &&
    folded.every(
      (range, index) =>
        range.from === topLevel[index].from && range.to === topLevel[index].to
    );

  return {
    canCollapse: topLevel.length > 0 && !isIndexShown,
    canExpand: folded.length > 0,
  };
};

/**
 * Effects that collapse the top level. Earlier folds are opened first, so a
 * collection expanded again shows all of its groups.
 */
export const collapseAllEffects = (state: EditorState) => [
  ...unfoldAllEffects(state),
  ...getTopLevelFoldRanges(state).map((range) => foldEffect.of(range)),
];

export const expandAllEffects = unfoldAllEffects;
