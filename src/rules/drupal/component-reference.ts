import type { Token } from '../../language/lexer.ts';
import { createRule } from '../../util/rule.ts';

/** A template path into a components folder, such as `@my_theme/components/card/card.twig`. */
const COMPONENT_PATH = /(^|\/)components\/.+\.twig$/;

/**
 * Components should be included by their Single Directory Component ID (`my_theme:card`), not by the path to
 * their Twig file. The ID lets Drupal load the component's CSS and JS and check its props.
 */
export default createRule({
  name: 'drupal/component-reference',
  description: 'Include components by their SDC ID instead of a file path',
  type: 'suggestion',
  level: 'off',
  fixable: false,
  messages: { path: 'Include the component by its ID ("provider:component") instead of the path "{{path}}".' },
  check({ doc, report }) {
    const check = (t: Token | undefined): void => {
      if (t?.type !== 'string') return;
      const path = t.value.slice(1, -1);
      if (COMPONENT_PATH.test(path)) report(t.start, 'path', { path });
    };
    for (const seg of doc.segments) {
      if (seg.kind === 'block' && (seg.tag === 'include' || seg.tag === 'embed')) check(seg.tokens[1]);
      seg.tokens.forEach((t, i) => {
        const prev = seg.tokens[i - 1];
        if (t.type === 'name' && t.value === 'include' && seg.tokens[i + 1]?.value === '(' && !(prev && (prev.value === '.' || prev.value === '|'))) {
          check(seg.tokens[i + 2]);
        }
      });
    }
  },
});
