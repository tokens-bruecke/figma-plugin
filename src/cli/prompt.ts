/**
 * A tiny keyboard-driven prompt built on node:readline keypress events, so the
 * CLI gets arrow-key navigation without pulling in a prompts dependency.
 *
 * The key handling is a pure reducer (applyKey) so it can be tested without a
 * terminal; only the rendering touches stdout.
 */

export interface KeyI {
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  sequence?: string;
}

export interface ChoiceI<T> {
  value: T;
  label: string;
  hint?: string;
}

export interface ListStateI {
  index: number;
  selected: number[];
}

export type KeyOutcome =
  | { type: 'update'; state: ListStateI }
  | { type: 'submit'; state: ListStateI }
  | { type: 'cancel' };

export interface ApplyKeyOptionsI {
  count: number;
  multi: boolean;
}

const clampIndex = (index: number, count: number) =>
  ((index % count) + count) % count;

const toggle = (selected: number[], index: number) =>
  selected.includes(index)
    ? selected.filter((i) => i !== index)
    : [...selected, index].sort((a, b) => a - b);

/**
 * Map one keypress onto the next list state. Wraps at both ends, supports
 * vim keys, digit jumps, and space-to-toggle in multi-select.
 */
export const applyKey = (
  state: ListStateI,
  key: KeyI,
  { count, multi }: ApplyKeyOptionsI
): KeyOutcome => {
  const name = key.name ?? '';

  if ((key.ctrl && (name === 'c' || name === 'd')) || name === 'escape') {
    return { type: 'cancel' };
  }

  if (name === 'up' || name === 'k' || (key.name === 'tab' && key.meta)) {
    return {
      type: 'update',
      state: { ...state, index: clampIndex(state.index - 1, count) },
    };
  }

  if (name === 'down' || name === 'j' || name === 'tab') {
    return {
      type: 'update',
      state: { ...state, index: clampIndex(state.index + 1, count) },
    };
  }

  if (name === 'home') {
    return { type: 'update', state: { ...state, index: 0 } };
  }

  if (name === 'end') {
    return { type: 'update', state: { ...state, index: count - 1 } };
  }

  // Digit jumps straight to a row — faster than arrowing through eight colours
  if (/^[1-9]$/.test(name)) {
    const index = Number(name) - 1;
    if (index < count) {
      return { type: 'update', state: { ...state, index } };
    }
    return { type: 'update', state };
  }

  if (multi && (name === 'space' || key.sequence === ' ')) {
    return {
      type: 'update',
      state: { ...state, selected: toggle(state.selected, state.index) },
    };
  }

  if (multi && name === 'a') {
    const all = state.selected.length === count;
    return {
      type: 'update',
      state: {
        ...state,
        selected: all ? [] : Array.from({ length: count }, (_, i) => i),
      },
    };
  }

  if (name === 'return' || name === 'enter') {
    const state_ = multi ? state : { ...state, selected: [state.index] };
    return { type: 'submit', state: state_ };
  }

  return { type: 'update', state };
};

const CURSOR_HIDE = '\x1B[?25l';
const CURSOR_SHOW = '\x1B[?25h';
const DIM = '\x1B[2m';
const CYAN = '\x1B[36m';
const GREEN = '\x1B[32m';
const RESET = '\x1B[0m';

export interface RenderOptionsI<T> {
  title: string;
  choices: ChoiceI<T>[];
  state: ListStateI;
  multi: boolean;
  hint?: string;
  color: boolean;
}

/** Render the list as lines. Kept pure so tests can assert on the output. */
export const renderList = <T>({
  title,
  choices,
  state,
  multi,
  hint,
  color,
}: RenderOptionsI<T>): string[] => {
  const paint = (code: string, text: string) =>
    color ? `${code}${text}${RESET}` : text;

  const lines = [
    `${paint(GREEN, '?')} ${title}${hint ? ` ${paint(DIM, hint)}` : ''}`,
  ];

  choices.forEach((choice, i) => {
    const active = i === state.index;
    const pointer = active ? paint(CYAN, '❯') : ' ';
    const box = multi ? (state.selected.includes(i) ? '◉ ' : '◯ ') : '';
    const label = active
      ? paint(CYAN, `${box}${choice.label}`)
      : `${box}${choice.label}`;
    const hintText = choice.hint ? `  ${paint(DIM, choice.hint)}` : '';
    lines.push(`${pointer} ${label}${hintText}`);
  });

  return lines;
};

export const renderAnswer = (title: string, answer: string, color: boolean) => {
  const paint = (code: string, text: string) =>
    color ? `${code}${text}${RESET}` : text;
  return `${paint(GREEN, '?')} ${title} ${paint(DIM, '›')} ${paint(
    CYAN,
    answer
  )}`;
};

export interface PromptIoI {
  input: NodeJS.ReadStream;
  output: NodeJS.WriteStream;
  color?: boolean;
}

export class PromptCancelledError extends Error {
  constructor() {
    super('Prompt cancelled');
    this.name = 'PromptCancelledError';
  }
}

/**
 * Run one interactive list prompt. Resolves to the selected indices.
 */
const runList = async <T>(
  { input, output, color = true }: PromptIoI,
  title: string,
  choices: ChoiceI<T>[],
  {
    multi,
    initial,
    hint,
  }: { multi: boolean; initial: ListStateI; hint?: string }
): Promise<number[]> => {
  const readline = await import('node:readline');
  readline.emitKeypressEvents(input);
  const wasRaw = input.isRaw;
  input.setRawMode?.(true);
  input.resume();
  output.write(CURSOR_HIDE);

  let state = initial;
  let rendered = 0;

  const draw = () => {
    if (rendered > 0) {
      output.write(`\x1B[${rendered}A\x1B[0J`);
    }
    const lines = renderList({ title, choices, state, multi, hint, color });
    output.write(lines.join('\n') + '\n');
    rendered = lines.length;
  };

  draw();

  return new Promise<number[]>((resolve, reject) => {
    const cleanup = () => {
      input.off('keypress', onKeypress);
      input.setRawMode?.(Boolean(wasRaw));
      input.pause();
      output.write(CURSOR_SHOW);
    };

    const finish = (indices: number[]) => {
      // Replace the list with a one-line summary of what was chosen
      if (rendered > 0) output.write(`\x1B[${rendered}A\x1B[0J`);
      const answer = indices.length
        ? indices.map((i) => choices[i].label.trim()).join(', ')
        : 'none';
      output.write(renderAnswer(title, answer, color) + '\n');
      cleanup();
      resolve(indices);
    };

    function onKeypress(_str: string, key: KeyI) {
      const outcome = applyKey(state, key ?? {}, {
        count: choices.length,
        multi,
      });

      if (outcome.type === 'cancel') {
        cleanup();
        reject(new PromptCancelledError());
        return;
      }

      state = outcome.state;

      if (outcome.type === 'submit') {
        finish(state.selected);
        return;
      }

      draw();
    }

    input.on('keypress', onKeypress);
  });
};

export const select = async <T>(
  io: PromptIoI,
  title: string,
  choices: ChoiceI<T>[],
  defaultIndex = 0
): Promise<T> => {
  const [index] = await runList(io, title, choices, {
    multi: false,
    initial: { index: defaultIndex, selected: [defaultIndex] },
    hint: '(↑↓ to move, enter to select)',
  });
  return choices[index].value;
};

export const multiselect = async <T>(
  io: PromptIoI,
  title: string,
  choices: ChoiceI<T>[]
): Promise<T[]> => {
  const indices = await runList(io, title, choices, {
    multi: true,
    initial: { index: 0, selected: [] },
    hint: '(space to toggle, a for all, enter to confirm)',
  });
  return indices.map((i) => choices[i].value);
};

export const confirm = async (
  io: PromptIoI,
  title: string,
  defaultValue = true
): Promise<boolean> => {
  const choices: ChoiceI<boolean>[] = [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' },
  ];
  return select(io, title, choices, defaultValue ? 0 : 1);
};

/** Raw mode is unavailable on some terminals; callers fall back to typed input. */
export const supportsRawMode = (input: NodeJS.ReadStream): boolean =>
  Boolean(input.isTTY && typeof input.setRawMode === 'function');
