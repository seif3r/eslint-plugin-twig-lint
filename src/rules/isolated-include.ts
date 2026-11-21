import type { Segment } from '../language/lexer.ts';
import { createRule, type Suggestion } from '../util/rule.ts';
import { analyze } from '../util/syntax.ts';
import { splitCommas, topLevel } from '../util/wrap.ts';

interface Options {
  /** Also require `only` on `{% embed %}`. Default `false`, because embed blocks often use outer variables. */
  embed: boolean;
}

/** Whether `include(…)` starting at the `(` with index `paren` passes `with_context: false`. */
function hasIsolatedContext(seg: Segment, paren: number): boolean {
  const tokens = seg.tokens;
  const close = tokens[paren]!.match!;
  const s = analyze(seg);
  const args = splitCommas(tokens, paren + 1, close - 1);
  for (const [i, [a, b]] of args.entries()) {
    const first = tokens[a]!;
    const sep = tokens[a + 1];
    const named = first.type === 'name' && sep !== undefined && a + 1 < b && (s.colons.get(a + 1) === 'named' || sep.value === '=');
    if (named && first.value === 'with_context') return b === a + 2 && tokens[b]!.value === 'false';
    if (!named && i === 2) return a === b && first.value === 'false';
  }
  return false;
}

/** Index of the top-level `only` keyword in an include or embed tag, or -1. */
function onlyIndex(seg: Segment): number {
  const tokens = seg.tokens;
  return topLevel(tokens, 1, tokens.length - 1).find((k) => {
    const prev = tokens[k - 1];
    return tokens[k]!.type === 'name' && tokens[k]!.value === 'only' && !(prev && (prev.value === '.' || prev.value === '|'));
  }) ?? -1;
}

/**
 * Included templates should not see the caller's variables: `include()` passes `with_context: false` and
 * `{% include %}` ends with `only`. Leaking variables makes components depend on where they are used.
 */
export default createRule<Options>({
  name: 'isolated-include',
  description: 'Require includes to be isolated from the calling template',
  type: 'suggestion',
  level: 'warn',
  fixable: false,
  hasSuggestions: true,
  optionsSchema: { embed: { type: 'boolean' } },
  defaultOptions: { embed: false },
  messages: {
    function: 'include() should pass with_context: false, so the template does not see the caller\'s variables.',
    tag: '{% {{tag}} %} should end with "only", so the template does not see the caller\'s variables.',
    addContext: 'Add with_context: false.',
    addOnly: 'Add "only".',
  },
  check({ doc, options, suggest }) {
    for (const seg of doc.segments) {
      if (seg.kind !== 'output' && seg.kind !== 'block') continue;
      const tokens = seg.tokens;
      if (seg.kind === 'block' && (seg.tag === 'include' || (seg.tag === 'embed' && options.embed))) {
        if (onlyIndex(seg) >= 0) continue;
        const last = tokens[tokens.length - 1]!;
        const sg: Suggestion = { messageId: 'addOnly', edits: [{ start: last.end, end: last.end, text: ' only' }] };
        suggest(seg.start, 'tag', { tag: seg.tag }, [sg]);
        continue;
      }
      tokens.forEach((t, i) => {
        const paren = tokens[i + 1];
        const prev = tokens[i - 1];
        if (t.type !== 'name' || t.value !== 'include' || paren?.value !== '(' || paren.match === undefined) return;
        if (prev && (prev.value === '.' || prev.value === '|')) return;
        if (hasIsolatedContext(seg, i + 1)) return;
        const before = tokens[paren.match - 1]!;
        const edit = before.value === ','
          ? { start: before.end, end: before.end, text: ' with_context: false,' }
          : { start: before.end, end: before.end, text: ', with_context: false' };
        suggest(t.start, 'function', undefined, [{ messageId: 'addContext', edits: [edit] }]);
      });
    }
  },
});
