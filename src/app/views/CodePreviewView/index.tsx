import React from 'react';

import styles from './styles.module.scss';

import { getTokensStat } from '@common/transform/getTokensStat';
import { JsonViewer } from '@app/components/JsonViewer';
import { track } from '@app/api/analytics';

import { Text, Icon, PanelHeader } from 'react-figma-ui/ui';

interface CodePreviewViewProps {
  generatedTokens: any;
  /** Set in Dev Mode, where the preview fills the panel and needs a way back */
  onClose?: () => void;
}

const copy = require('clipboard-copy');

export const CodePreviewView = ({
  generatedTokens,
  onClose,
}: CodePreviewViewProps) => {
  const isPanel = !!onClose;
  const [isUpdateButtonAnimated, setIsUpdateButtonAnimated] =
    React.useState<boolean>(false);
  const [tokensStat, setTokensStat] = React.useState<any>(null);
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
    copy(JSON.stringify(generatedTokens, null, 2));
    setIsCodeCopied(true);

    // stop animation
    setTimeout(() => {
      setIsCodeCopied(false);
    }, 2000);
  };

  React.useEffect(() => {
    if (generatedTokens) {
      setTokensStat(getTokensStat(generatedTokens));
    }
  }, [generatedTokens]);

  if (!tokensStat || !generatedTokens) {
    return null;
  }

  return (
    <section
      className={`${styles.codePreview} ${
        isPanel ? styles.panelCodePreview : ''
      }`}
    >
      {isPanel && (
        <PanelHeader title="Output" isActive hasBackButton onClick={onClose} />
      )}

      <section className={styles.previewToolbar}>
        <button
          className={`${styles.toolbarItem} ${styles.previewToolbarButton} ${
            isUpdateButtonAnimated ? styles.successUpdateAnimation : ''
          }`}
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

        <div className={`${styles.toolbarItem} ${styles.previewToolbarStat}`}>
          <Text>
            {tokensStat.tokensCount} tokens, {tokensStat.groupsCount} groups,{' '}
            {tokensStat.codeLines} lines
          </Text>
        </div>

        <div className={`${styles.toolbarItem} ${styles.previewToolbarStat}`}>
          <Text>{tokensStat.size / 1000} KB</Text>
        </div>
      </section>

      <div className={styles.viewer}>
        <JsonViewer code={JSON.stringify(generatedTokens, null, 2)} />
      </div>

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
