import React from 'react';
import { createPortal } from 'react-dom';

import { Icon, OverlayList } from 'react-figma-ui/ui';

import {
  buildTokenGraph,
  layoutTokenGraph,
  GRAPH_NODE_WIDTH,
  GRAPH_NODE_HEIGHT,
  GRAPH_COLUMN_GAP,
  TokenGraphNodeI,
} from '@common/transform/tokenGraph';

import styles from './styles.module.scss';

interface TokenGraphProps {
  tokens: unknown;
  /** Where the search and zoom tools render, the output header */
  toolbarTarget?: HTMLElement | null;
}

interface ViewI {
  x: number;
  y: number;
  k: number;
}

/**
 * Level of detail: zooming out drops the value, then all text,
 * until each token is a block of its own color
 */
type LodT = 'full' | 'compact' | 'overview';

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 2;
const PADDING = 40;
// room above the columns for their labels, in screen pixels
const LABEL_SPACE = 28;
// room below for the output's floating Update / Copy bar
const BOTTOM_SPACE = 72;
// the zoom a jump to a token lands on, when the view is further out
const READABLE_ZOOM = 1;

const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

const getLod = (k: number): LodT =>
  k >= 0.7 ? 'full' : k >= 0.3 ? 'compact' : 'overview';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const formatTokenValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.length === 1
      ? formatTokenValue(value[0])
      : `${value.length} layers`;
  }
  if (!isPlainObject(value)) {
    return String(value);
  }
  if (typeof value.hex === 'string') {
    return value.hex;
  }
  if ('value' in value && 'unit' in value) {
    return `${value.value}${value.unit}`;
  }

  return Object.values(value)
    .slice(0, 3)
    .map((item) =>
      isPlainObject(item) || Array.isArray(item)
        ? formatTokenValue(item)
        : String(item)
    )
    .join(' · ');
};

/** A CSS color for color tokens, from the value at the end of the chain */
const getSwatch = (node: TokenGraphNodeI): string | null => {
  if (node.type !== 'color') {
    return null;
  }

  const value = node.resolvedValue;

  if (typeof value === 'string' && !value.startsWith('{')) {
    return value;
  }
  if (isPlainObject(value)) {
    if (typeof value.hex === 'string') {
      return value.hex;
    }
    // DTCG color object: sRGB components from 0 to 1
    if (
      value.colorSpace === 'srgb' &&
      Array.isArray(value.components) &&
      value.components.length === 3
    ) {
      const [r, g, b] = (value.components as number[]).map((c) =>
        Math.round(c * 255)
      );
      const alpha = typeof value.alpha === 'number' ? value.alpha : 1;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  return null;
};

const getValueText = (node: TokenGraphNodeI) => {
  if (node.isMissing) {
    return 'Not in this export';
  }

  return formatTokenValue(
    node.refs.length && node.resolvedValue !== undefined
      ? node.resolvedValue
      : node.value
  );
};

const getColumnLabel = (depth: number) => {
  if (depth === 0) {
    return 'Values';
  }
  if (depth === 1) {
    return 'Aliases';
  }
  if (depth === 2) {
    return 'Aliases of aliases';
  }
  return `${depth} levels deep`;
};

type NodeStateT = 'idle' | 'focus' | 'chain' | 'dim';

interface GraphNodeProps {
  node: TokenGraphNodeI;
  x: number;
  y: number;
  state: NodeStateT;
  isSelected: boolean;
  isMatch: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const GraphNode = React.memo(
  ({
    node,
    x,
    y,
    state,
    isSelected,
    isMatch,
    onHover,
    onSelect,
  }: GraphNodeProps) => {
    const swatch = getSwatch(node);
    const leaf = node.path[node.path.length - 1];
    const parent = node.path[node.path.length - 2];

    return (
      <div
        className={[
          styles.node,
          styles[state],
          isSelected ? styles.selected : '',
          isMatch ? styles.match : '',
          node.isMissing ? styles.missing : '',
        ].join(' ')}
        style={
          {
            transform: `translate(${x}px, ${y}px)`,
            '--swatch': swatch ?? undefined,
          } as React.CSSProperties
        }
        title={node.id}
        data-node
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(node.id)}
      >
        {swatch ? (
          <span className={styles.swatch} />
        ) : (
          <span className={styles.typeGlyph}>
            {(node.type ?? '?').charAt(0).toUpperCase()}
          </span>
        )}

        <span className={styles.nodeText}>
          <span className={styles.nodeName}>
            {parent && <span className={styles.nodeParent}>{parent} / </span>}
            {leaf}
          </span>
          <span className={styles.nodeValue}>{getValueText(node)}</span>
        </span>
      </div>
    );
  }
);

/** Every token up and down the alias chain, not siblings */
const getChain = (graph: ReturnType<typeof buildTokenGraph>, id: string) => {
  const chain = new Set<string>([id]);

  const walk = (
    from: string,
    key: 'refs' | 'referencedBy',
    seen: Set<string>
  ) => {
    graph.nodes.get(from)?.[key].forEach((next) => {
      if (!seen.has(next)) {
        seen.add(next);
        chain.add(next);
        walk(next, key, seen);
      }
    });
  };

  walk(id, 'refs', new Set([id]));
  walk(id, 'referencedBy', new Set([id]));

  return chain;
};

const LINK_LIST_LIMIT = 8;

/** The chevron react-figma-ui's Dropdown draws, like Color mode's */
const DropdownChevron = () => (
  <svg
    className={styles.chevron}
    width="8"
    height="7"
    viewBox="0 0 8 7"
    aria-hidden
  >
    <path d="M3.646 5.354l-3-3 .708-.708L4 4.293l2.646-2.647.708.708-3 3L4 5.707l-.354-.353z" />
  </svg>
);

const ALL_TYPES = '__all';
const LINKED_ONLY = '__linked';
const UNTYPED = 'no type';

const getTypeKey = (node: TokenGraphNodeI) => node.type ?? UNTYPED;

export const TokenGraph = ({ tokens, toolbarTarget }: TokenGraphProps) => {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const graph = React.useMemo(() => buildTokenGraph(tokens), [tokens]);
  const [isLinkedOnly, setIsLinkedOnly] = React.useState(false);

  // null shows every type. A type that first appears after Update shows
  // only while no type is picked
  const [shownTypes, setShownTypes] = React.useState<Set<string> | null>(null);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = React.useState(false);
  const typeButtonRef = React.useRef<HTMLButtonElement>(null);

  const typeCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    graph.order.forEach((id) => {
      const type = getTypeKey(graph.nodes.get(id)!);
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [graph]);

  const toggleType = (type: string) => {
    // also in the menu, for panes too narrow for its own button
    if (type === LINKED_ONLY) {
      setIsLinkedOnly((prev) => !prev);
      return;
    }
    if (type === ALL_TYPES) {
      setShownTypes(null);
      return;
    }

    setShownTypes((prev) => {
      // from all types, a click narrows the graph to just that type
      if (!prev) {
        return new Set([type]);
      }

      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next.size ? next : null;
    });
  };

  const visibleIds = React.useMemo(() => {
    const isTypeShown = (id: string) =>
      !shownTypes || shownTypes.has(getTypeKey(graph.nodes.get(id)!));

    return graph.order.filter((id) => {
      if (!isTypeShown(id)) {
        return false;
      }
      if (!isLinkedOnly) {
        return true;
      }

      // linked to a token that's still shown, so no card ends up alone
      const node = graph.nodes.get(id)!;
      return [...node.refs, ...node.referencedBy].some(isTypeShown);
    });
  }, [graph, isLinkedOnly, shownTypes]);

  const layout = React.useMemo(
    () => layoutTokenGraph(graph, visibleIds),
    [graph, visibleIds]
  );

  const columnCounts = React.useMemo(() => {
    const counts = new Map<number, number>();
    visibleIds.forEach((id) => {
      const depth = graph.nodes.get(id)!.depth;
      counts.set(depth, (counts.get(depth) ?? 0) + 1);
    });
    return counts;
  }, [graph, visibleIds]);

  const [view, setView] = React.useState<ViewI>({
    x: PADDING,
    y: PADDING + LABEL_SPACE,
    k: 1,
  });
  const viewRef = React.useRef(view);
  viewRef.current = view;

  // eases programmatic moves (fit, jump to a token), never wheel or drag
  const [isAnimated, setIsAnimated] = React.useState(false);
  const animate = () => {
    setIsAnimated(true);
    window.setTimeout(() => setIsAnimated(false), 250);
  };

  const [isPanning, setIsPanning] = React.useState(false);
  const didDragRef = React.useRef(false);

  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [matchIndex, setMatchIndex] = React.useState(-1);

  const getViewportSize = () => {
    const element = viewportRef.current;
    return {
      width: element?.clientWidth ?? 0,
      height: element?.clientHeight ?? 0,
    };
  };

  /**
   * Fits the whole graph. On first open it won't go below compact zoom,
   * so a large file opens readable at its top left instead of as a speck
   */
  const fitView = React.useCallback(
    (isInitial = false) => {
      const { width, height } = getViewportSize();
      if (!width || !height) {
        return;
      }

      const fitK = clampZoom(
        Math.min(
          1,
          (width - PADDING * 2) / Math.max(layout.width, 1),
          (height - PADDING - LABEL_SPACE - BOTTOM_SPACE) /
            Math.max(layout.height, 1)
        )
      );
      const k = isInitial ? Math.max(fitK, 0.5) : fitK;
      const contentWidth = layout.width * k;

      setView({
        k,
        x:
          contentWidth < width - PADDING * 2
            ? (width - contentWidth) / 2
            : PADDING,
        y: PADDING + LABEL_SPACE,
      });
    },
    [layout]
  );

  // a jump to a token the type filter hid waits for the new layout
  const pendingJumpRef = React.useRef<string | null>(null);

  // first open, and when a filter reshapes the graph
  React.useLayoutEffect(() => {
    if (pendingJumpRef.current) {
      centerOn(pendingJumpRef.current);
      pendingJumpRef.current = null;
      return;
    }
    fitView(true);
  }, [isLinkedOnly, shownTypes]);

  // a token can disappear after Update or a filter change
  React.useEffect(() => {
    if (selectedId && !layout.positions.has(selectedId)) {
      setSelectedId(null);
    }
  }, [layout, selectedId]);

  const zoomAt = (factor: number, cx: number, cy: number) => {
    setView((prev) => {
      const k = clampZoom(prev.k * factor);
      const ratio = k / prev.k;
      return {
        k,
        x: cx - (cx - prev.x) * ratio,
        y: cy - (cy - prev.y) * ratio,
      };
    });
  };

  const zoomFromCenter = (factor: number) => {
    const { width, height } = getViewportSize();
    animate();
    zoomAt(factor, width / 2, height / 2);
  };

  const resetZoom = () => {
    const { width, height } = getViewportSize();
    animate();
    zoomAt(1 / viewRef.current.k, width / 2, height / 2);
  };

  const centerOn = (id: string) => {
    const position = layout.positions.get(id);
    if (!position) {
      return;
    }

    const { width, height } = getViewportSize();
    const k = Math.max(viewRef.current.k, READABLE_ZOOM);

    animate();
    setView({
      k,
      x: width / 2 - (position.x + GRAPH_NODE_WIDTH / 2) * k,
      y: height / 2 - (position.y + GRAPH_NODE_HEIGHT / 2) * k,
    });
  };

  // wheel pans, pinch or ⌘/Ctrl + wheel zooms toward the pointer, as in Figma
  React.useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        const rect = element.getBoundingClientRect();
        // a mouse wheel step is ~100, a pinch step a few units
        const delta = Math.max(-50, Math.min(50, event.deltaY));
        zoomAt(
          Math.exp(-delta * 0.01),
          event.clientX - rect.left,
          event.clientY - rect.top
        );
        return;
      }

      setView((prev) => ({
        ...prev,
        x: prev.x - event.deltaX,
        y: prev.y - event.deltaY,
      }));
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  // drag anywhere pans; a press that doesn't move is a click
  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 && event.button !== 1) {
      return;
    }
    if ((event.target as HTMLElement).closest('[data-no-pan]')) {
      return;
    }

    didDragRef.current = false;
    const start = {
      x: event.clientX,
      y: event.clientY,
      viewX: viewRef.current.x,
      viewY: viewRef.current.y,
    };

    const handleMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - start.x;
      const dy = moveEvent.clientY - start.y;

      if (!didDragRef.current && Math.hypot(dx, dy) < 3) {
        return;
      }

      didDragRef.current = true;
      setIsPanning(true);
      setView((prev) => ({
        ...prev,
        x: start.viewX + dx,
        y: start.viewY + dy,
      }));
    };

    const handleUp = () => {
      setIsPanning(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  // a click on empty canvas deselects; one on a token or in the
  // details card (its links select another token) doesn't
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (
      !didDragRef.current &&
      !(event.target as HTMLElement).closest('[data-node], [data-no-pan]')
    ) {
      setSelectedId(null);
    }
  };

  const handleHover = React.useCallback(
    (id: string | null) => {
      if (!isPanning) {
        setHoveredId(id);
      }
    },
    [isPanning]
  );

  const handleSelect = React.useCallback((id: string) => {
    if (!didDragRef.current) {
      setSelectedId((prev) => (prev === id ? null : id));
    }
  }, []);

  const jumpTo = (id: string) => {
    setSelectedId(id);

    // a link in the details card can lead to a type that's filtered out:
    // show that type too, then move once it's laid out
    const node = graph.nodes.get(id);
    if (!layout.positions.has(id) && node && shownTypes) {
      pendingJumpRef.current = id;
      setShownTypes(new Set([...shownTypes, getTypeKey(node)]));
      return;
    }

    centerOn(id);
  };

  // search
  const matches = React.useMemo(() => {
    const search = query.trim().toLowerCase();
    return search
      ? visibleIds.filter((id) => id.toLowerCase().includes(search))
      : null;
  }, [query, visibleIds]);
  const matchSet = React.useMemo(
    () => (matches ? new Set(matches) : null),
    [matches]
  );

  React.useEffect(() => {
    setMatchIndex(-1);
  }, [matches]);

  const goToMatch = (direction: 1 | -1) => {
    if (!matches?.length) {
      return;
    }

    const next =
      matchIndex === -1 && direction === -1
        ? matches.length - 1
        : (matchIndex + direction + matches.length) % matches.length;

    setMatchIndex(next);
    jumpTo(matches[next]);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const closeSearch = () => {
    setQuery('');
    setIsSearchOpen(false);
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

  // ⌘F searches, Esc deselects, Shift+1 fits and Shift+0 goes to 100%
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        openSearch();
        return;
      }

      if ((event.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      if (event.key === 'Escape') {
        setSelectedId(null);
      } else if (event.shiftKey && event.code === 'Digit1') {
        animate();
        fitView();
      } else if (event.shiftKey && event.code === 'Digit0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView]);

  // hover wins over the selection, so hovering previews another chain
  const focusId = hoveredId ?? selectedId;
  const chain = React.useMemo(
    () => (focusId ? getChain(graph, focusId) : null),
    [graph, focusId]
  );

  const getNodeState = (id: string): NodeStateT => {
    if (id === focusId) {
      return 'focus';
    }
    if (chain) {
      return chain.has(id) ? 'chain' : 'dim';
    }
    if (matchSet && !matchSet.has(id)) {
      return 'dim';
    }
    return 'idle';
  };

  const edgePaths = React.useMemo(
    () =>
      graph.edges
        .map(({ from, to }) => {
          const alias = layout.positions.get(from);
          const target = layout.positions.get(to);
          if (!alias || !target) {
            return null;
          }

          const x1 = target.x + GRAPH_NODE_WIDTH;
          const y1 = target.y + GRAPH_NODE_HEIGHT / 2;
          const x2 = alias.x;
          const y2 = alias.y + GRAPH_NODE_HEIGHT / 2;
          const dx = Math.max(40, (x2 - x1) / 2);

          return {
            from,
            to,
            d: `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`,
          };
        })
        .filter(Boolean) as { from: string; to: string; d: string }[],
    [graph, layout]
  );

  const lod = getLod(view.k);
  const selectedNode = selectedId ? graph.nodes.get(selectedId) : null;

  // the dot grid moves and scales with the canvas, and fades when too dense
  const gridSize = 24 * view.k;

  const toolbar = (
    <div
      className={`${styles.toolbar} ${isSearchOpen ? styles.isSearching : ''}`}
    >
      <div
        className={`${styles.toolbarBox} ${
          isSearchOpen ? styles.searchBox : ''
        }`}
      >
        {isSearchOpen ? (
          <>
            <input
              ref={inputRef}
              type="text"
              placeholder="Find a token…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={() => !query && setIsSearchOpen(false)}
              spellCheck={false}
            />
            {matches && (
              <span className={styles.matchCount}>
                {matchIndex >= 0
                  ? `${matchIndex + 1}/${matches.length}`
                  : matches.length}
              </span>
            )}
            <button
              className={styles.matchStep}
              onClick={() => goToMatch(-1)}
              disabled={!matches?.length}
              title="Previous match (Shift+Enter)"
            >
              <Icon name="arrow-up" size="16" />
            </button>
            <button
              className={styles.matchStep}
              onClick={() => goToMatch(1)}
              disabled={!matches?.length}
              title="Next match (Enter)"
            >
              <Icon name="arrow-down" size="16" />
            </button>
            <button onClick={closeSearch} title="Close search (Esc)">
              <Icon name="cross" size="16" />
            </button>
          </>
        ) : (
          <button onClick={openSearch} title="Find a token (⌘F)">
            <Icon name="search" size="16" />
          </button>
        )}
      </div>

      <div
        className={`${styles.toolbarBox} ${styles.typeFilter} ${styles.filterGroup}`}
      >
        <button
          ref={typeButtonRef}
          className={`${styles.textButton} ${shownTypes ? styles.pressed : ''}`}
          onClick={() => setIsTypeMenuOpen((prev) => !prev)}
          aria-expanded={isTypeMenuOpen}
          title="Show only some token types"
        >
          <span className={styles.typeLabel}>
            {!shownTypes
              ? 'All types'
              : shownTypes.size === 1
              ? [...shownTypes][0]
              : `${shownTypes.size} types`}
          </span>
          <DropdownChevron />
        </button>

        {isTypeMenuOpen && (
          <OverlayList
            className={styles.typeMenu}
            trigger={typeButtonRef.current ?? undefined}
            onOutsideClick={() => setIsTypeMenuOpen(false)}
            onClick={toggleType}
            maxHeight={320}
            optionsSections={[
              {
                options: [
                  {
                    id: ALL_TYPES,
                    label: 'All types',
                    caption: String(graph.order.length),
                    icon: !shownTypes && <Icon name="tick" size="16" />,
                  },
                ],
              },
              {
                options: typeCounts.map(([type, count]) => ({
                  id: type,
                  label: type,
                  caption: String(count),
                  icon: shownTypes?.has(type) && <Icon name="tick" size="16" />,
                })),
              },
              {
                options: [
                  {
                    id: LINKED_ONLY,
                    label: 'Linked only',
                    icon: isLinkedOnly && <Icon name="tick" size="16" />,
                  },
                ],
              },
            ]}
          />
        )}
      </div>

      <div
        className={`${styles.toolbarBox} ${styles.filterGroup} ${styles.linkedGroup}`}
      >
        <button
          className={`${styles.textButton} ${
            isLinkedOnly ? styles.pressed : ''
          }`}
          onClick={() => setIsLinkedOnly((prev) => !prev)}
          aria-pressed={isLinkedOnly}
          title="Hide tokens that neither alias nor are aliased"
        >
          Linked only
        </button>
      </div>

      <div className={`${styles.toolbarBox} ${styles.zoomGroup}`}>
        <button
          className={styles.zoomStep}
          onClick={() => zoomFromCenter(1 / 1.5)}
          title="Zoom out"
        >
          −
        </button>
        <button
          className={`${styles.textButton} ${styles.zoomValue}`}
          onClick={resetZoom}
          title="Zoom to 100% (Shift+0)"
        >
          {Math.round(view.k * 100)}%
        </button>
        <button
          className={styles.zoomStep}
          onClick={() => zoomFromCenter(1.5)}
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => {
            animate();
            fitView();
          }}
          title="Zoom to fit (Shift+1)"
        >
          <Icon name="target" size="16" />
        </button>
      </div>
    </div>
  );

  const renderLinkList = (title: string, ids: string[]) =>
    ids.length > 0 && (
      <div className={styles.detailSection}>
        <span className={styles.detailLabel}>
          {title} · {ids.length}
        </span>
        {ids.slice(0, LINK_LIST_LIMIT).map((id) => (
          <button
            key={id}
            className={styles.detailLink}
            onClick={() => jumpTo(id)}
            title={id}
          >
            {id}
          </button>
        ))}
        {ids.length > LINK_LIST_LIMIT && (
          <span className={styles.detailMore}>
            {ids.length - LINK_LIST_LIMIT} more
          </span>
        )}
      </div>
    );

  return (
    <div
      ref={viewportRef}
      className={`${styles.viewport} ${isPanning ? styles.panning : ''}`}
      style={{
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
        backgroundImage: gridSize < 10 ? 'none' : undefined,
      }}
      onPointerDown={handlePointerDown}
      onClick={handleCanvasClick}
    >
      {toolbarTarget && createPortal(toolbar, toolbarTarget)}

      {visibleIds.length === 0 ? (
        <div className={styles.empty}>
          {isLinkedOnly
            ? shownTypes
              ? 'None of these tokens alias each other'
              : 'No token here aliases another'
            : 'No tokens to show'}
        </div>
      ) : (
        <div
          className={`${styles.canvas} ${isAnimated ? styles.animated : ''}`}
          data-lod={lod}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          }}
        >
          {layout.columns.map(({ depth, x }) => (
            <div
              key={depth}
              className={styles.columnLabel}
              style={{
                transform: `translate(${x}px, 0) scale(${
                  1 / view.k
                }) translateY(-100%)`,
                // screen pixels, so zoomed out it shortens instead of
                // running into the next column's label
                maxWidth: (GRAPH_NODE_WIDTH + GRAPH_COLUMN_GAP - 12) * view.k,
              }}
            >
              <span className={styles.columnName}>{getColumnLabel(depth)}</span>
              <span className={styles.columnCount}>
                {columnCounts.get(depth)}
              </span>
            </div>
          ))}

          <svg
            className={styles.edges}
            width={Math.max(layout.width, 1)}
            height={Math.max(layout.height, 1)}
          >
            {/* the highlighted chain draws last, on top */}
            {[...edgePaths]
              .sort(
                (a, b) =>
                  Number(!!chain?.has(a.from) && chain.has(a.to)) -
                  Number(!!chain?.has(b.from) && chain.has(b.to))
              )
              .map(({ from, to, d }) => {
                const isActive = !!chain?.has(from) && chain.has(to);
                return (
                  <path
                    key={`${from}>${to}`}
                    d={d}
                    vectorEffect="non-scaling-stroke"
                    className={[
                      styles.edge,
                      isActive ? styles.activeEdge : '',
                      (chain && !isActive) || (!chain && matchSet)
                        ? styles.dimEdge
                        : '',
                    ].join(' ')}
                  />
                );
              })}
          </svg>

          {visibleIds.map((id) => {
            const position = layout.positions.get(id)!;
            return (
              <GraphNode
                key={id}
                node={graph.nodes.get(id)!}
                x={position.x}
                y={position.y}
                state={getNodeState(id)}
                isSelected={id === selectedId}
                isMatch={!!matchSet?.has(id)}
                onHover={handleHover}
                onSelect={handleSelect}
              />
            );
          })}
        </div>
      )}

      {selectedNode && (
        <aside className={styles.details} data-no-pan>
          <div className={styles.detailHeader}>
            {getSwatch(selectedNode) && (
              <span
                className={styles.swatch}
                style={
                  {
                    '--swatch': getSwatch(selectedNode),
                  } as React.CSSProperties
                }
              />
            )}
            <span className={styles.detailPath}>{selectedNode.id}</span>
            <button onClick={() => setSelectedId(null)} title="Close (Esc)">
              <Icon name="cross" size="16" />
            </button>
          </div>

          <div className={styles.detailMeta}>
            <span>{selectedNode.type ?? 'no type'}</span>
            <span className={styles.detailValue}>
              {getValueText(selectedNode)}
            </span>
          </div>

          {renderLinkList('Points to', selectedNode.refs)}
          {renderLinkList('Used by', selectedNode.referencedBy)}
        </aside>
      )}
    </div>
  );
};
