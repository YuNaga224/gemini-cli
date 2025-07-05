/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { IndividualToolCallDisplay, ToolCallStatus } from '../../types.js';
import { DiffRenderer } from './DiffRenderer.js';
import { Colors } from '../../colors.js';
import { MarkdownDisplay } from '../../utils/MarkdownDisplay.js';
import { GeminiRespondingSpinner } from '../GeminiRespondingSpinner.js';
import { MaxSizedBox } from '../shared/MaxSizedBox.js';
import { OptionSelector } from '../learning/OptionSelector.js';
import { QuestionDisplay } from '../learning/QuestionDisplay.js';
import { LearningQuestion } from '../../types/learning.js';

const STATIC_HEIGHT = 1;
const RESERVED_LINE_COUNT = 5; // for tool name, status, padding etc.
const STATUS_INDICATOR_WIDTH = 3;
const MIN_LINES_SHOWN = 2; // show at least this many lines

// Large threshold to ensure we don't cause performance issues for very large
// outputs that will get truncated further MaxSizedBox anyway.
const MAXIMUM_RESULT_DISPLAY_CHARACTERS = 1000000;
export type TextEmphasis = 'high' | 'medium' | 'low';

export interface ToolMessageProps extends IndividualToolCallDisplay {
  availableTerminalHeight?: number;
  terminalWidth: number;
  emphasis?: TextEmphasis;
  renderOutputAsMarkdown?: boolean;
  onQuestionSelect?: (answer: string, optionIndex?: number) => void;
  isFocused?: boolean;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({
  name,
  description,
  resultDisplay,
  status,
  availableTerminalHeight,
  terminalWidth,
  emphasis = 'medium',
  renderOutputAsMarkdown = true,
  uiComponents,
  onQuestionSelect,
  isFocused = false,
}) => {
  const availableHeight = availableTerminalHeight
    ? Math.max(
        availableTerminalHeight - STATIC_HEIGHT - RESERVED_LINE_COUNT,
        MIN_LINES_SHOWN + 1, // enforce minimum lines shown
      )
    : undefined;

  // Long tool call response in MarkdownDisplay doesn't respect availableTerminalHeight properly,
  // we're forcing it to not render as markdown when the response is too long, it will fallback
  // to render as plain text, which is contained within the terminal using MaxSizedBox
  if (availableHeight) {
    renderOutputAsMarkdown = false;
  }

  const childWidth = terminalWidth - 3; // account for padding.
  if (typeof resultDisplay === 'string') {
    if (resultDisplay.length > MAXIMUM_RESULT_DISPLAY_CHARACTERS) {
      // Truncate the result display to fit within the available width.
      resultDisplay =
        '...' + resultDisplay.slice(-MAXIMUM_RESULT_DISPLAY_CHARACTERS);
    }
  }
  return (
    <Box paddingX={1} paddingY={0} flexDirection="column">
      <Box minHeight={1}>
        <ToolStatusIndicator status={status} />
        <ToolInfo
          name={name}
          status={status}
          description={description}
          emphasis={emphasis}
        />
        {emphasis === 'high' && <TrailingIndicator />}
      </Box>
      {resultDisplay && (
        <Box paddingLeft={STATUS_INDICATOR_WIDTH} width="100%" marginTop={1}>
          <Box flexDirection="column">
            {typeof resultDisplay === 'string' && renderOutputAsMarkdown && (
              <Box flexDirection="column">
                <MarkdownDisplay
                  text={resultDisplay}
                  isPending={false}
                  availableTerminalHeight={availableHeight}
                  terminalWidth={childWidth}
                />
              </Box>
            )}
            {typeof resultDisplay === 'string' && !renderOutputAsMarkdown && (
              <MaxSizedBox maxHeight={availableHeight} maxWidth={childWidth}>
                <Box>
                  <Text wrap="wrap">{resultDisplay}</Text>
                </Box>
              </MaxSizedBox>
            )}
            {typeof resultDisplay !== 'string' && (
              <DiffRenderer
                diffContent={resultDisplay.fileDiff}
                filename={resultDisplay.fileName}
                availableTerminalHeight={availableHeight}
                terminalWidth={childWidth}
              />
            )}
          </Box>
        </Box>
      )}
      
      {/* UIコンポーネントの表示（選択肢付き質問） */}
      {uiComponents && uiComponents.type === 'question-selector' && (
        <Box paddingLeft={STATUS_INDICATOR_WIDTH} width="100%" marginTop={1}>
          <Box flexDirection="column">
            {/* 質問の表示 */}
            <Box marginBottom={1}>
              <Text bold color={Colors.AccentBlue}>
                📝 {uiComponents.question || '質問'}
              </Text>
            </Box>
            
            {/* 選択肢の表示 */}
            <OptionSelector
              options={uiComponents.options || []}
              onSelect={(answer, optionIndex) => {
                if (onQuestionSelect) {
                  onQuestionSelect(answer, optionIndex);
                }
              }}
              allowCustomInput={uiComponents.allowCustomInput || false}
              customInputPlaceholder={uiComponents.placeholder}
              isFocused={isFocused && (status === ToolCallStatus.AwaitingUserInput || (status === ToolCallStatus.Confirming && uiComponents?.type === 'question-selector'))}
            />
          </Box>
        </Box>
      )}
      
      {/* ロードマップグラフの表示 */}
      {uiComponents && uiComponents.type === 'roadmap-graph' && (
        <Box paddingLeft={STATUS_INDICATOR_WIDTH} width="100%" marginTop={1}>
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text bold color={Colors.AccentBlue}>
                🗺️ 学習ロードマップ
              </Text>
            </Box>
            
            {/* TODO: RoadmapDisplayコンポーネントを統合 */}
            <Box
              borderStyle="single"
              borderColor={Colors.AccentBlue}
              padding={1}
              marginBottom={1}
            >
              <Text>
                📊 グラフ形式のロードマップ表示機能は実装中です
              </Text>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

type ToolStatusIndicatorProps = {
  status: ToolCallStatus;
};

const ToolStatusIndicator: React.FC<ToolStatusIndicatorProps> = ({
  status,
}) => (
  <Box minWidth={STATUS_INDICATOR_WIDTH}>
    {status === ToolCallStatus.Pending && (
      <Text color={Colors.AccentGreen}>o</Text>
    )}
    {status === ToolCallStatus.Executing && (
      <GeminiRespondingSpinner
        spinnerType="toggle"
        nonRespondingDisplay={'⊷'}
      />
    )}
    {status === ToolCallStatus.Success && (
      <Text color={Colors.AccentGreen}>✔</Text>
    )}
    {status === ToolCallStatus.Confirming && (
      <Text color={Colors.AccentYellow}>?</Text>
    )}
    {status === ToolCallStatus.Canceled && (
      <Text color={Colors.AccentYellow} bold>
        -
      </Text>
    )}
    {status === ToolCallStatus.Error && (
      <Text color={Colors.AccentRed} bold>
        x
      </Text>
    )}
  </Box>
);

type ToolInfo = {
  name: string;
  description: string;
  status: ToolCallStatus;
  emphasis: TextEmphasis;
};
const ToolInfo: React.FC<ToolInfo> = ({
  name,
  description,
  status,
  emphasis,
}) => {
  const nameColor = React.useMemo<string>(() => {
    switch (emphasis) {
      case 'high':
        return Colors.Foreground;
      case 'medium':
        return Colors.Foreground;
      case 'low':
        return Colors.Gray;
      default: {
        const exhaustiveCheck: never = emphasis;
        return exhaustiveCheck;
      }
    }
  }, [emphasis]);
  return (
    <Box>
      <Text
        wrap="truncate-end"
        strikethrough={status === ToolCallStatus.Canceled}
      >
        <Text color={nameColor} bold>
          {name}
        </Text>{' '}
        <Text color={Colors.Gray}>{description}</Text>
      </Text>
    </Box>
  );
};

const TrailingIndicator: React.FC = () => (
  <Text color={Colors.Foreground} wrap="truncate">
    {' '}
    ←
  </Text>
);
