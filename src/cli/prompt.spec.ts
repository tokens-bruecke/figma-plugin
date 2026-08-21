import { describe, it, expect } from 'vitest';
import { applyKey, renderList, renderAnswer } from './prompt';

const state = (index = 0, selected: number[] = []) => ({ index, selected });
const opts = (multi = false, count = 4) => ({ count, multi });

const nextState = (s: any, key: any, o: any) => {
  const outcome = applyKey(s, key, o);
  if (outcome.type === 'cancel') throw new Error('cancelled');
  return outcome.state;
};

describe('applyKey — movement', () => {
  it('moves down and up', () => {
    expect(nextState(state(0), { name: 'down' }, opts()).index).toBe(1);
    expect(nextState(state(2), { name: 'up' }, opts()).index).toBe(1);
  });

  it('wraps at both ends', () => {
    expect(nextState(state(3), { name: 'down' }, opts()).index).toBe(0);
    expect(nextState(state(0), { name: 'up' }, opts()).index).toBe(3);
  });

  it('supports vim keys and tab', () => {
    expect(nextState(state(0), { name: 'j' }, opts()).index).toBe(1);
    expect(nextState(state(1), { name: 'k' }, opts()).index).toBe(0);
    expect(nextState(state(0), { name: 'tab' }, opts()).index).toBe(1);
  });

  it('jumps home and end', () => {
    expect(nextState(state(2), { name: 'home' }, opts()).index).toBe(0);
    expect(nextState(state(0), { name: 'end' }, opts()).index).toBe(3);
  });

  it('jumps to a row by digit, ignoring out-of-range digits', () => {
    expect(nextState(state(0), { name: '3' }, opts()).index).toBe(2);
    expect(nextState(state(1), { name: '9' }, opts()).index).toBe(1);
  });

  it('ignores unrelated keys', () => {
    expect(nextState(state(1), { name: 'x' }, opts()).index).toBe(1);
  });
});

describe('applyKey — selection', () => {
  it('submits the highlighted row in single-select', () => {
    const outcome = applyKey(state(2), { name: 'return' }, opts());
    expect(outcome.type).toBe('submit');
    expect(outcome.type === 'submit' && outcome.state.selected).toEqual([2]);
  });

  it('toggles with space in multi-select', () => {
    let s = nextState(state(0), { name: 'space' }, opts(true));
    expect(s.selected).toEqual([0]);
    s = nextState({ ...s, index: 2 }, { name: 'space' }, opts(true));
    expect(s.selected).toEqual([0, 2]);
    s = nextState({ ...s, index: 0 }, { name: 'space' }, opts(true));
    expect(s.selected).toEqual([2]);
  });

  it('keeps selections sorted regardless of toggle order', () => {
    let s = nextState(state(3), { name: 'space' }, opts(true));
    s = nextState({ ...s, index: 1 }, { name: 'space' }, opts(true));
    expect(s.selected).toEqual([1, 3]);
  });

  it('does not toggle with space in single-select', () => {
    expect(nextState(state(0), { name: 'space' }, opts()).selected).toEqual([]);
  });

  it('toggles all with "a" and clears when already full', () => {
    let s = nextState(state(0), { name: 'a' }, opts(true));
    expect(s.selected).toEqual([0, 1, 2, 3]);
    s = nextState(s, { name: 'a' }, opts(true));
    expect(s.selected).toEqual([]);
  });

  it('submits an empty multi-select as none', () => {
    const outcome = applyKey(state(1), { name: 'return' }, opts(true));
    expect(outcome.type === 'submit' && outcome.state.selected).toEqual([]);
  });
});

describe('applyKey — cancellation', () => {
  it('cancels on ctrl+c, ctrl+d and escape', () => {
    expect(applyKey(state(), { name: 'c', ctrl: true }, opts()).type).toBe(
      'cancel'
    );
    expect(applyKey(state(), { name: 'd', ctrl: true }, opts()).type).toBe(
      'cancel'
    );
    expect(applyKey(state(), { name: 'escape' }, opts()).type).toBe('cancel');
  });

  it('does not cancel on a plain c', () => {
    expect(applyKey(state(), { name: 'c' }, opts()).type).toBe('update');
  });

  it('tolerates a keypress with no key object', () => {
    expect(applyKey(state(1), {} as any, opts()).type).toBe('update');
  });
});

describe('renderList', () => {
  const choices = [
    { value: 'a', label: 'Alpha', hint: 'first' },
    { value: 'b', label: 'Beta' },
  ];

  it('marks the active row with a pointer', () => {
    const lines = renderList({
      title: 'Pick',
      choices,
      state: state(1),
      multi: false,
      color: false,
    });
    expect(lines[0]).toBe('? Pick');
    expect(lines[1]).toBe('  Alpha  first');
    expect(lines[2]).toBe('❯ Beta');
  });

  it('shows checkboxes in multi-select', () => {
    const lines = renderList({
      title: 'Pick',
      choices,
      state: state(0, [1]),
      multi: true,
      color: false,
    });
    expect(lines[1]).toContain('◯ Alpha');
    expect(lines[2]).toContain('◉ Beta');
  });

  it('omits ANSI codes when color is off', () => {
    const lines = renderList({
      title: 'Pick',
      choices,
      state: state(0),
      multi: false,
      color: false,
    });
    expect(lines.join('\n')).not.toContain('\x1B[');
  });

  it('emits ANSI codes when color is on', () => {
    const lines = renderList({
      title: 'Pick',
      choices,
      state: state(0),
      multi: false,
      color: true,
    });
    expect(lines.join('\n')).toContain('\x1B[');
  });

  it('renders one line per choice plus the title', () => {
    const lines = renderList({
      title: 'Pick',
      choices,
      state: state(0),
      multi: false,
      color: false,
    });
    expect(lines).toHaveLength(3);
  });
});

describe('renderAnswer', () => {
  it('collapses to a single summary line', () => {
    expect(renderAnswer('Color mode', 'HEX', false)).toBe('? Color mode › HEX');
  });
});
