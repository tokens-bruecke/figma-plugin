import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import {
  codeFolding,
  foldable,
  foldedRanges,
  foldEffect,
} from '@codemirror/language';
import { json } from '@codemirror/lang-json';

import {
  collapseAllEffects,
  expandAllEffects,
  getFoldStatus,
  getTopLevelFoldRanges,
} from './folding';

const createState = (value: unknown) =>
  EditorState.create({
    doc: JSON.stringify(value, null, 2),
    extensions: [json(), codeFolding()],
  });

const getFolded = (state: EditorState) => {
  const ranges: { from: number; to: number }[] = [];
  foldedRanges(state).between(0, state.doc.length, (from, to) => {
    ranges.push({ from, to });
  });
  return ranges;
};

const tokens = {
  Colors: {
    brand: { primary: { $type: 'color', $value: '#000000' } },
  },
  'Theme/Light': {
    surface: { $type: 'color', $value: '#ffffff' },
  },
  list: [1, 2],
  $schema: 'https://example.com/schema.json',
};

describe('getTopLevelFoldRanges', () => {
  it('folds the value of each top-level object or array, not the root', () => {
    const state = createState(tokens);
    const ranges = getTopLevelFoldRanges(state);

    expect(ranges).toHaveLength(3);

    const lines = ranges.map((range) =>
      state.doc.lineAt(range.from).text.trim()
    );
    expect(lines).toEqual(['"Colors": {', '"Theme/Light": {', '"list": [']);

    // the root object stays open
    expect(ranges.every((range) => range.from > 1)).toBe(true);
  });

  it('returns nothing for a document without a root object', () => {
    expect(getTopLevelFoldRanges(createState([1, 2]))).toEqual([]);
    expect(getTopLevelFoldRanges(createState({}))).toEqual([]);
  });
});

describe('collapse / expand all', () => {
  it('collapses to the top level, replacing earlier folds', () => {
    let state = createState(tokens);

    // a nested group folded through the gutter
    const nestedLine = state.doc.line(3);
    expect(nestedLine.text.trim()).toBe('"brand": {');
    const nested = foldable(state, nestedLine.from, nestedLine.to)!;
    state = state.update({ effects: foldEffect.of(nested) }).state;
    expect(getFolded(state)).toEqual([nested]);

    state = state.update({ effects: collapseAllEffects(state) }).state;

    expect(getFolded(state)).toEqual(getTopLevelFoldRanges(state));
  });

  it('opens every fold on expand', () => {
    let state = createState(tokens);
    state = state.update({ effects: collapseAllEffects(state) }).state;
    expect(getFolded(state)).toHaveLength(3);

    state = state.update({ effects: expandAllEffects(state) }).state;
    expect(getFolded(state)).toEqual([]);
  });
});

describe('getFoldStatus', () => {
  it('allows only collapsing when nothing is folded', () => {
    expect(getFoldStatus(createState(tokens))).toEqual({
      canCollapse: true,
      canExpand: false,
    });
  });

  it('allows only expanding when the index shows', () => {
    let state = createState(tokens);
    state = state.update({ effects: collapseAllEffects(state) }).state;

    expect(getFoldStatus(state)).toEqual({
      canCollapse: false,
      canExpand: true,
    });
  });

  it('allows both when only some groups are folded', () => {
    let state = createState(tokens);

    // one collection folded through the gutter
    const [first] = getTopLevelFoldRanges(state);
    state = state.update({ effects: foldEffect.of(first) }).state;
    expect(getFoldStatus(state)).toEqual({
      canCollapse: true,
      canExpand: true,
    });

    // only a nested group folded, the collections open
    state = state.update({ effects: expandAllEffects(state) }).state;
    const nestedLine = state.doc.line(3);
    state = state.update({
      effects: foldEffect.of(foldable(state, nestedLine.from, nestedLine.to)!),
    }).state;
    expect(getFoldStatus(state)).toEqual({
      canCollapse: true,
      canExpand: true,
    });
  });

  it('allows neither when there is nothing to fold', () => {
    expect(getFoldStatus(createState({ $schema: 'x' }))).toEqual({
      canCollapse: false,
      canExpand: false,
    });
  });
});
