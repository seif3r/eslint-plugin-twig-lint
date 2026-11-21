// Shared implementation of `no-debug` (Twig's own debug functions) and `drupal/no-debug` (Drupal's).
import { createRule, type Edit, type TwigRuleDefinition } from './rule.ts';

interface Options {
  /** Debug functions and filters to report. Replaces the rule's default list. */
  functions: string[];
  /** Debug functions and filters to report in addition to the list in `functions`. */
  additionalFunctions: string[];
}

export function createDebugRule(def: {
  name: string;
  description: string;
  defaults: string[];
  level: 'error' | 'warn';
}): TwigRuleDefinition {
  return createRule<Options>({
    name: def.name,
    description: def.description,
    type: 'problem',
    level: def.level,
    fixable: false,
    hasSuggestions: true,
    optionsSchema: {
      functions: { type: 'array', items: { type: 'string', minLength: 1 } },
      additionalFunctions: { type: 'array', items: { type: 'string', minLength: 1 } },
    },
    defaultOptions: { functions: def.defaults, additionalFunctions: [] },
    messages: {
      debug: 'Remove the debug output "{{name}}" before committing.',
      remove: 'Remove this debug output.',
    },
    check({ doc, options, suggest }) {
      const names = new Set([...options.functions, ...options.additionalFunctions]);
      const { src } = doc;
      for (const seg of doc.segments) {
        if (seg.kind !== 'output' && seg.kind !== 'block') continue;
        const tokens = seg.tokens;
        tokens.forEach((t, i) => {
          if (t.type !== 'name' || !names.has(t.value)) return;
          const prev = tokens[i - 1];
          const next = tokens[i + 1];
          const isFilter = prev?.type === 'punctuation' && prev.value === '|';
          const isCall = next?.type === 'punctuation' && next.value === '(' && !(prev && prev.value === '.');
          if (!isFilter && !isCall) return;
          // Suggest removing the whole tag when it holds nothing but the debug call: {{ dump(x) }}.
          const suggestions = [];
          if (seg.kind === 'output' && isCall && i === 0 && next.match === tokens.length - 1) {
            const lineStart = src.lastIndexOf('\n', seg.start - 1) + 1;
            const newline = src.indexOf('\n', seg.end);
            const lineEnd = newline < 0 ? src.length : newline;
            const alone = src.slice(lineStart, seg.start).trim() === '' && src.slice(seg.end, lineEnd).trim() === '';
            const edit: Edit = alone
              ? { start: lineStart, end: newline < 0 ? src.length : newline + 1, text: '' }
              : { start: seg.start, end: seg.end, text: '' };
            suggestions.push({ messageId: 'remove', edits: [edit] });
          }
          suggest(t.start, 'debug', { name: isFilter ? `|${t.value}` : `${t.value}()` }, suggestions);
        });
      }
    },
  });
}
