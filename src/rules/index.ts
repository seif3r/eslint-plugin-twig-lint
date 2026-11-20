import attributeSpacing from './attribute-spacing.ts';
import attributeWrap from './attribute-wrap.ts';
import blankLineAfterBlock from './blank-line-after-block.ts';
import blockIndent from './block-indent.ts';
import delimiterSpacing from './delimiter-spacing.ts';
import emptyLines from './empty-lines.ts';
import endblockName from './endblock-name.ts';
import expressionWrap from './expression-wrap.ts';
import finalNewline from './final-newline.ts';
import nestedIndent from './nested-indent.ts';
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
  'nested-indent': nestedIndent,
  'trailing-whitespace': trailingWhitespace,
};
