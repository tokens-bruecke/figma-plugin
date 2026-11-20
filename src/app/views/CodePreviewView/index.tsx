import React from 'react';

import styles from './styles.module.scss';

import { getTokensStat } from '@common/transform/getTokensStat';
import {
  filterExcludedCollections,
  SplitOptionsI,
} from '@common/transform/splitTokensIntoFiles';
import { JsonViewer } from '@app/components/JsonViewer';
import { TokenGraph } from '@app/components/TokenGraph';
import { track } from '@app/api/analytics';

import {
  Text,
  Icon,
  PanelHeader,
  SegmentedControl,
  Tabs,
} from 'react-figma-ui/ui';

type OutputTabT = 'json' | 'graph';

/** Set while a Git push leaves some collections out */
export interface PushSelectionI {
  splitOptions: SplitOptionsI;
  pushedCount: number;
  totalCount: number;
}

interface CodePreviewViewProps {
  generatedTokens: any;
  pushSelection?: PushSelectionI | null;
  /** Set in Dev Mode, where the preview fills the panel and needs a way back */
  onClose?: () => void;
  /** The export for this opening is still running: show a skeleton */
  isLoading?: boolean;
}

// The JSON view's layout with square bars for text: same font, line
// height and gutters. A fixed pattern of indents and widths, repeated
const SKELETON_PATTERN: [indent: number, width: number][] = [
  [1, 10],
  [2, 14],
  [3, 18],
  [3, 12],
  [3, 26],
  [2, 16],
  [3, 18],
  [3, 10],
  [3, 22],
];
const SKELETON_ROWS = Array.from({ length: 6 }, () => SKELETON_PATTERN).flat();

const OutputSkeleton = () => (
  <div className={styles.skeleton} role="status" aria-label="Exporting tokens">
    {SKELETON_ROWS.map(([indent, width], index) => (
      <div key={index} className={styles.skeletonRow}>
        <span className={styles.skeletonNumber}>
          <span className={styles.skeletonBar} style={{ width: '2ch' }} />
        </span>
        <span className={styles.skeletonFold} />
        <span
          className={styles.skeletonCode}
          style={{ paddingLeft: `calc(6px + ${indent * 2}ch)` }}
        >
          <span
            className={styles.skeletonBar}
            style={{ width: `${width}ch` }}
          />
        </span>
      </div>
    ))}
  </div>
);

const copy = require('clipboard-copy');

export const CodePreviewView = ({
  generatedTokens,
  pushSelection = null,
  onClose,
  isLoading = false,
}: CodePreviewViewProps) => {
  // All by default: Download JSON and the other servers export everything
  const [isPushedOnly, setIsPushedOnly] = React.useState<boolean>(false);
  const isFiltered = !!pushSelection && isPushedOnly;
  // What the preview shows, copies and counts
  const shownTokens = React.useMemo(
    () =>
      isFiltered && generatedTokens
        ? filterExcludedCollections(generatedTokens, pushSelection.splitOptions)
        : generatedTokens,
    [generatedTokens, isFiltered, pushSelection]
  );
  const isPanel = !!onClose;
  const [activeTab, setActiveTab] = React.useState<OutputTabT>('json');

  // Counted once per opening: the output, which shows JSON first, and
  // whether that opening reached the Graph tab
  React.useEffect(() => {
    track('/output');
  }, []);
  const isGraphTrackedRef = React.useRef(false);
  React.useEffect(() => {
    if (activeTab === 'graph' && !isGraphTrackedRef.current) {
      isGraphTrackedRef.current = true;
      track('/output/graph');
    }
  }, [activeTab]);
  // each view renders its own tools (fold, search, zoom) into the header
  const [headerTools, setHeaderTools] = React.useState<HTMLDivElement | null>(
    null
  );
  const [isUpdateButtonAnimated, setIsUpdateButtonAnimated] =
    React.useState<boolean>(false);
  const [isCodeCopied, setIsCodeCopied] = React.useState<boolean>(false);
  const isResizingRef = React.useRef(false);

  const startWidthResize = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    isResizingRef.current = true;
    document.body.classList.add(styles.resizingCursor);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) {
        return;
      }

      // the handle sits on the right edge, so the pointer's X position
      // is effectively the desired frame width
      parent.postMessage(
        {
          pluginMessage: {
            type: 'resizeUIWidth',
            width: moveEvent.clientX + 4,
          },
        },
        '*'
      );
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.classList.remove(styles.resizingCursor);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const resetWidth = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: 'resetUIWidth',
        },
      },
      '*'
    );
  };

  const getTokensPreview = () => {
    // send command to figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: 'getTokens',
          role: 'preview',
        } as TokensMessageI,
      },
      '*'
    );

    // start animation
    setIsUpdateButtonAnimated(true);

    // stop animation
    setTimeout(() => {
      setIsUpdateButtonAnimated(false);
    }, 500);
  };

  const copyCode = () => {
    track('/copy');
    // copy code to clipboard
    copy(JSON.stringify(shownTokens, null, 2));
    setIsCodeCopied(true);

    // stop animation
    setTimeout(() => {
      setIsCodeCopied(false);
    }, 2000);
  };

  // computed while rendering, so the pane shows on its first frame
  const tokensStat = React.useMemo(
    () => (shownTokens ? getTokensStat(shownTokens) : null),
    [shownTokens]
  );
  const code = React.useMemo(
    () => JSON.stringify(shownTokens, null, 2),
    [shownTokens]
  );

  return (
    <section
      className={`${styles.codePreview} ${
        isPanel ? styles.panelCodePreview : ''
      }`}
    >
      {isPanel && (
        <PanelHeader title="Output" isActive hasBackButton onClick={onClose} />
      )}

      <header className={styles.tabsHeader}>
        <Tabs
          className={styles.tabs}
          value={activeTab}
          onChange={(value) => setActiveTab(value as OutputTabT)}
          options={[
            { value: 'json', label: 'JSON' },
            { value: 'graph', label: 'Graph' },
          ]}
        />
        <div ref={setHeaderTools} className={styles.headerTools} />
      </header>

      {isLoading || !tokensStat ? (
        <OutputSkeleton />
      ) : (
        <>
          <section
            className={`${styles.previewToolbar} ${
              pushSelection ? styles.hasFilter : ''
            }`}
          >
            <button
              className={`${styles.toolbarItem} ${
                styles.previewToolbarButton
              } ${isUpdateButtonAnimated ? styles.successUpdateAnimation : ''}`}
              onClick={getTokensPreview}
            >
              <Icon name="refresh" size="16" />
              <Text>Update</Text>
            </button>

            <button
              className={`${styles.toolbarItem} ${styles.previewToolbarSecondButton}`}
              onClick={copyCode}
            >
              <Text>{isCodeCopied ? 'Copied!' : 'Copy'}</Text>
            </button>

            {/* Only while a Git push leaves collections out */}
            {pushSelection && (
              <SegmentedControl
                className={styles.previewToolbarFilter}
                aria-label="Collections shown"
                value={isPushedOnly ? 'push' : 'all'}
                onChange={(value) => setIsPushedOnly(value === 'push')}
                options={[
                  {
                    value: 'all',
                    label: 'All',
                    title: 'Show the whole export, as Download JSON saves it',
                  },
                  {
                    value: 'push',
                    label: `To push ${pushSelection.pushedCount}/${pushSelection.totalCount}`,
                    title: `Show only the ${pushSelection.pushedCount} of ${pushSelection.totalCount} collections a push commits`,
                  },
                ]}
              />
            )}

            <div
              className={`${styles.toolbarItem} ${styles.previewToolbarStat}`}
            >
              <Text>
                {tokensStat.tokensCount} tokens, {tokensStat.groupsCount}{' '}
                groups, {tokensStat.codeLines} lines
              </Text>
            </div>

            <div
              className={`${styles.toolbarItem} ${styles.previewToolbarStat}`}
            >
              <Text>{tokensStat.size / 1000} KB</Text>
            </div>
          </section>

          {/* JSON stays mounted, so its folds and scroll survive a tab switch */}
          <div className={styles.viewer} hidden={activeTab !== 'json'}>
            <JsonViewer
              code={code}
              toolbarTarget={activeTab === 'json' ? headerTools : null}
            />
          </div>

          {activeTab === 'graph' && (
            <div className={styles.viewer}>
              <TokenGraph tokens={shownTokens} toolbarTarget={headerTools} />
            </div>
          )}
        </>
      )}

      {!isPanel && (
        <div
          className={styles.widthResizer}
          onMouseDown={startWidthResize}
          onDoubleClick={resetWidth}
          title="Drag to resize. Double-click to reset"
        />
      )}
    </section>
  );
};
