import { describe, expect, it } from 'vitest';

import {
  buildTokenGraph,
  layoutTokenGraph,
  GRAPH_NODE_HEIGHT,
} from './tokenGraph';

const tokens = {
  base: {
    $type: 'color',
    primary: {
      10: { $value: '#000000' },
      20: { $value: '#ffffff' },
    },
  },
  keys: {
    primary: { $type: 'color', $value: '{base.primary.10}' },
    surface: { $type: 'color', $value: '{base.primary.20}' },
  },
  button: {
    bg: { $type: 'color', $value: '{keys.primary}' },
    shadow: {
      $type: 'shadow',
      $value: { color: '{keys.surface}', blur: '4px' },
    },
    ghost: { $type: 'color', $value: '{other.collection.color}' },
  },
  $extensions: { ignored: { $value: 1 } },
};

describe('buildTokenGraph', () => {
  const graph = buildTokenGraph(tokens);

  it('collects tokens in document order, inheriting the group $type', () => {
    expect(graph.order.slice(0, 2)).toEqual([
      'base.primary.10',
      'base.primary.20',
    ]);
    expect(graph.nodes.get('base.primary.10')!.type).toBe('color');
    expect(graph.nodes.has('$extensions.ignored')).toBe(false);
  });

  it('links aliases, including references inside composite values', () => {
    expect(graph.nodes.get('keys.primary')!.refs).toEqual(['base.primary.10']);
    expect(graph.nodes.get('button.shadow')!.refs).toEqual(['keys.surface']);
    expect(graph.nodes.get('keys.surface')!.referencedBy).toEqual([
      'button.shadow',
    ]);
  });

  it('measures depth as the longest chain to a raw value', () => {
    expect(graph.nodes.get('base.primary.10')!.depth).toBe(0);
    expect(graph.nodes.get('keys.primary')!.depth).toBe(1);
    expect(graph.nodes.get('button.bg')!.depth).toBe(2);
    expect(graph.maxDepth).toBe(2);
  });

  it('resolves a chain of aliases to its raw value', () => {
    expect(graph.nodes.get('button.bg')!.resolvedValue).toBe('#000000');
  });

  it('adds references outside the export as missing tokens', () => {
    const missing = graph.nodes.get('other.collection.color')!;
    expect(missing.isMissing).toBe(true);
    expect(missing.referencedBy).toEqual(['button.ghost']);
    expect(graph.nodes.get('button.ghost')!.resolvedValue).toBeUndefined();
  });

  it('survives a reference cycle', () => {
    const cyclic = buildTokenGraph({
      a: { $value: '{b}' },
      b: { $value: '{a}' },
    });
    expect(cyclic.nodes.get('a')!.resolvedValue).toBeUndefined();
    expect(Number.isFinite(cyclic.nodes.get('a')!.depth)).toBe(true);
  });
});

describe('layoutTokenGraph', () => {
  const graph = buildTokenGraph(tokens);
  const layout = layoutTokenGraph(graph, graph.order);

  it('puts each depth in its own column, left to right', () => {
    expect(layout.columns.map((column) => column.depth)).toEqual([0, 1, 2]);
    expect(layout.positions.get('keys.primary')!.x).toBeGreaterThan(
      layout.positions.get('base.primary.10')!.x
    );
  });

  it('places an alias level with what it references', () => {
    expect(layout.positions.get('keys.surface')!.y).toBe(
      layout.positions.get('base.primary.20')!.y
    );
  });

  it('never overlaps tokens in a column', () => {
    layout.columns.forEach(({ x }) => {
      const ys = [...layout.positions.values()]
        .filter((position) => position.x === x)
        .map((position) => position.y)
        .sort((a, b) => a - b);
      ys.slice(1).forEach((y, index) => {
        expect(y - ys[index]).toBeGreaterThanOrEqual(GRAPH_NODE_HEIGHT);
      });
    });
  });
});
