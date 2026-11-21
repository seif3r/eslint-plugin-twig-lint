import attributeSpacing from './attribute-spacing.ts';
import attributeWrap from './attribute-wrap.ts';
import blankLineAfterBlock from './blank-line-after-block.ts';
import blockIndent from './block-indent.ts';
import delimiterSpacing from './delimiter-spacing.ts';
import emptyLines from './empty-lines.ts';
import endblockName from './endblock-name.ts';
import expressionWrap from './expression-wrap.ts';
import finalNewline from './final-newline.ts';
import hashKeyQuotes from './hash-key-quotes.ts';
import hashSpacing from './hash-spacing.ts';
import includeStyle from './include-style.ts';
import namedArguments from './named-arguments.ts';
import nestedIndent from './nested-indent.ts';
import operatorSpacing from './operator-spacing.ts';
import punctuationSpacing from './punctuation-spacing.ts';
import singleQuotes from './single-quotes.ts';
import trailingComma from './trailing-comma.ts';
import trailingWhitespace from './trailing-whitespace.ts';

export const rules = {
  'attribute-spacing': attributeSpacing,
  'attribute-wrap': attributeWrap,
  'blank-line-after-block': blankLineAfterBlock,
  'block-indent': blockIndent,
  'delimiter-spacing': delimiterSpacing,
  'empty-lines': emptyLines,
  'endblock-name': endblockName,
  'expression-wrap': expressionWrap,
  'final-newline': finalNewline,
  'hash-key-quotes': hashKeyQuotes,
  'hash-spacing': hashSpacing,
  'include-style': includeStyle,
  'named-arguments': namedArguments,
  'nested-indent': nestedIndent,
  'operator-spacing': operatorSpacing,
  'punctuation-spacing': punctuationSpacing,
  'single-quotes': singleQuotes,
  'trailing-comma': trailingComma,
  'trailing-whitespace': trailingWhitespace,
};
