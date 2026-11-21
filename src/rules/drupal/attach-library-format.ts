import { createRule } from '../../util/rule.ts';

/** `extension/library`: a machine name, one slash, and a library name. */
const LIBRARY = /^[a-z0-9_]+\/[^\s/:]+$/;

/**
 * `attach_library()` takes `extension/library`, as defined in the extension's `*.libraries.yml`. A colon, as in
 * `theme:button`, is the format of a Single Directory Component ID, which is a different thing.
 */
export default createRule({
  name: 'drupal/attach-library-format',
  description: 'Enforce the extension/library format in attach_library()',
  type: 'problem',
  level: 'error',
  fixable: false,
  messages: {
    component: '"{{value}}" looks like a component ID. attach_library() expects "extension/library".',
    format: '"{{value}}" is not a library name. attach_library() expects "extension/library".',
  },
  check({ doc, report }) {
    for (const seg of doc.segments) {
      seg.tokens.forEach((t, i) => {
        const paren = seg.tokens[i + 1];
        const arg = seg.tokens[i + 2];
        const prev = seg.tokens[i - 1];
        if (t.type !== 'name' || t.value !== 'attach_library' || paren?.value !== '(') return;
        if (prev && (prev.value === '.' || prev.value === '|')) return;
        if (arg?.type !== 'string' || seg.tokens[i + 3]?.value !== ')') return;
        const value = arg.value.slice(1, -1);
        if (value.includes('#{') || LIBRARY.test(value)) return;
        report(arg.start, value.includes(':') ? 'component' : 'format', { value });
      });
    }
  },
});
