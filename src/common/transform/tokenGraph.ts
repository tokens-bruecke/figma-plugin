/**
 * Turns the generated DTCG tokens into a graph of alias references,
 * laid out in columns: raw values on the left, then the tokens that alias
 * them, then the ones that alias those, and so on.
 */

export interface TokenGraphNodeI {
  /** The dot path, as aliases write it: `colors.light.base.primary.10` */
  id: string;
  path: string[];
  type: string | null;
  /** The token's own `$value`, an alias string or a raw value */
  value: unknown;
  /** The raw value at the end of the alias chain, when there's one */
  resolvedValue: unknown;
  /** Tokens this token references */
  refs: string[];
  /** Tokens that reference this token */
  referencedBy: string[];
  /** 0 for raw values, 1 + the deepest reference otherwise */
  depth: number;
  /** Referenced, but not part of the export */
  isMissing: boolean;
}

export interface TokenGraphI {
  nodes: Map<string, TokenGraphNodeI>;
  /** Ids in document order, missing references last */
  order: string[];
  edges: { from: string; to: string }[];
  maxDepth: number;
}

const REF_PATTERN = /\{([^{}]+)\}/g;
const PURE_ALIAS = /^\{([^{}]+)\}$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Every `{path}` reference anywhere inside a value, composites included */
const collectRefs = (value: unknown, into: Set<string>) => {
  if (typeof value === 'string') {
    for (const match of value.matchAll(REF_PATTERN)) {
      into.add(match[1].trim());
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectRefs(item, into));
  } else if (isPlainObject(value)) {
    Object.values(value).forEach((item) => collectRefs(item, into));
  }
};

export const buildTokenGraph = (tokens: unknown): TokenGraphI => {
  const nodes = new Map<string, TokenGraphNodeI>();
  const order: string[] = [];

  const walk = (
    group: unknown,
    path: string[],
    inheritedType: string | null
  ) => {
    if (!isPlainObject(group)) {
      return;
    }

    // $type on a group applies to the tokens inside it
    const type =
      typeof group.$type === 'string' ? (group.$type as string) : inheritedType;

    if ('$value' in group) {
      const refs = new Set<string>();
      collectRefs(group.$value, refs);

      const id = path.join('.');
      nodes.set(id, {
        id,
        path,
        type,
        value: group.$value,
        resolvedValue: undefined,
        refs: [...refs],
        referencedBy: [],
        depth: 0,
        isMissing: false,
      });
      order.push(id);
      return;
    }

    Object.entries(group).forEach(([key, child]) => {
      if (!key.startsWith('$')) {
        walk(child, [...path, key], type);
      }
    });
  };

  walk(tokens, [], null);

  // references to tokens outside the export, like a collection left out
  const edges: { from: string; to: string }[] = [];
  [...order].forEach((id) => {
    const node = nodes.get(id)!;

    node.refs.forEach((ref) => {
      if (!nodes.has(ref)) {
        nodes.set(ref, {
          id: ref,
          path: ref.split('.'),
          type: node.type,
          value: undefined,
          resolvedValue: undefined,
          refs: [],
          referencedBy: [],
          depth: 0,
          isMissing: true,
        });
        order.push(ref);
      }

      nodes.get(ref)!.referencedBy.push(id);
      edges.push({ from: id, to: ref });
    });
  });

  // depth: the longest chain down to a raw value. Figma doesn't allow
  // cycles, but a hand-edited file could have one, so guard against it
  const depthCache = new Map<string, number>();
  const visiting = new Set<string>();
  const getDepth = (id: string): number => {
    if (depthCache.has(id)) {
      return depthCache.get(id)!;
    }
    if (visiting.has(id)) {
      return 0;
    }

    visiting.add(id);
    const node = nodes.get(id)!;
    const depth = node.refs.length
      ? 1 + Math.max(...node.refs.map(getDepth))
      : 0;
    visiting.delete(id);
    depthCache.set(id, depth);
    return depth;
  };

  // the raw value behind a chain of plain aliases
  const resolve = (value: unknown, seen: Set<string>): unknown => {
    const match = typeof value === 'string' ? value.match(PURE_ALIAS) : null;

    if (!match) {
      return value;
    }

    const target = nodes.get(match[1].trim());
    if (!target || target.isMissing || seen.has(target.id)) {
      return undefined;
    }

    seen.add(target.id);
    return resolve(target.value, seen);
  };

  let maxDepth = 0;
  nodes.forEach((node) => {
    node.depth = getDepth(node.id);
    node.resolvedValue = resolve(node.value, new Set([node.id]));
    maxDepth = Math.max(maxDepth, node.depth);
  });

  return { nodes, order, edges, maxDepth };
};

export interface TokenGraphLayoutI {
  positions: Map<string, { x: number; y: number }>;
  columns: { depth: number; x: number }[];
  width: number;
  height: number;
}

export const GRAPH_NODE_WIDTH = 220;
export const GRAPH_NODE_HEIGHT = 44;
export const GRAPH_COLUMN_GAP = 120;
const ROW_GAP = 8;

/**
 * Columns by depth. The first column keeps document order; each next one
 * places a token level with the tokens it references (the average of
 * their centers) and pushes it down only to avoid overlapping, so links
 * stay mostly horizontal.
 */
export const layoutTokenGraph = (
  graph: TokenGraphI,
  visibleIds: string[]
): TokenGraphLayoutI => {
  const positions = new Map<string, { x: number; y: number }>();
  const byDepth = new Map<number, string[]>();

  visibleIds.forEach((id) => {
    const depth = graph.nodes.get(id)!.depth;
    if (!byDepth.has(depth)) {
      byDepth.set(depth, []);
    }
    byDepth.get(depth)!.push(id);
  });

  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  const columns: { depth: number; x: number }[] = [];
  let height = 0;

  depths.forEach((depth, columnIndex) => {
    const x = columnIndex * (GRAPH_NODE_WIDTH + GRAPH_COLUMN_GAP);
    columns.push({ depth, x });

    const ids = byDepth.get(depth)!;

    // where each token would like to sit: level with its references.
    // Every reference has a smaller depth, so it's placed already; tokens
    // without any (the first column) keep document order
    const desired = ids.map((id, index) => {
      const refYs = graph.nodes
        .get(id)!
        .refs.map((ref) => positions.get(ref)?.y)
        .filter((y): y is number => y !== undefined);

      const y = refYs.length
        ? refYs.reduce((sum, refY) => sum + refY, 0) / refYs.length
        : null;

      return { id, y, index };
    });

    desired.sort(
      (a, b) => (a.y ?? Infinity) - (b.y ?? Infinity) || a.index - b.index
    );

    let nextFreeY = 0;
    desired.forEach(({ id, y }) => {
      const top = y === null ? nextFreeY : Math.max(y, nextFreeY);

      positions.set(id, { x, y: top });
      nextFreeY = top + GRAPH_NODE_HEIGHT + ROW_GAP;
    });

    height = Math.max(height, nextFreeY);
  });

  const width = columns.length
    ? columns[columns.length - 1].x + GRAPH_NODE_WIDTH
    : 0;

  return { positions, columns, width, height };
};
