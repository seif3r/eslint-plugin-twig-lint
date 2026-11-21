import type { Segment, Token } from '../language/lexer.ts';
import { createRule, type Edit } from '../util/rule.ts';
import { analyze } from '../util/syntax.ts';
import { splitCommas, topLevel } from '../util/wrap.ts';

interface Options {
  /** `both` (default): no problems. `function`: `{{ include(…) }}`. `tag`: `{% include … %}`. */
  style: 'both' | 'function' | 'tag';
}

const text = (src: string, tokens: Token[], a: number, b: number): string => src.slice(tokens[a]!.start, tokens[b]!.end);

/** `{%-`/`{{-` and `-%}`/`-}}` keep their whitespace control when the delimiters are swapped. */
function delimiters(seg: Segment, to: 'output' | 'block'): [string, string] {
  const openTrim = seg.open.slice(2);
  const closeTrim = seg.close.slice(0, -2);
  return to === 'output' ? [`{{${openTrim}`, `${closeTrim}}}`] : [`{%${openTrim}`, `${closeTrim}%}`];
}

/** `{% include tpl [ignore missing] [with vars] [only] %}` → `{{ include(tpl[, vars][, with_context: false][, ignore_missing: true]) }}`. */
function tagToFunction(src: string, seg: Segment): string | null {
  const tokens = seg.tokens;
  const last = tokens.length - 1;
  if (last < 1) return null;
  const isKeyword = (k: number, value: string): boolean => {
    const t = tokens[k];
    const prev = tokens[k - 1];
    return t !== undefined && t.type === 'name' && t.value === value && !(prev && prev.type === 'punctuation' && (prev.value === '.' || prev.value === '|'));
  };
  const top = topLevel(tokens, 1, last).filter((k) => k > 1);
  const firstKeyword = top.find((k) => isKeyword(k, 'ignore') || isKeyword(k, 'with') || isKeyword(k, 'only'));
  const templateEnd = (firstKeyword ?? last + 1) - 1;
  let k = firstKeyword ?? last + 1;
  let ignoreMissing = false;
  let variables: string | null = null;
  let only = false;
  if (k <= last && isKeyword(k, 'ignore')) {
    if (!isKeyword(k + 1, 'missing')) return null;
    ignoreMissing = true;
    k += 2;
  }
  if (k <= last && isKeyword(k, 'with')) {
    const end = top.find((j) => j > k && isKeyword(j, 'only'));
    const varsEnd = (end ?? last + 1) - 1;
    if (varsEnd <= k) return null;
    variables = text(src, tokens, k + 1, varsEnd);
    k = varsEnd + 1;
  }
  if (k <= last && isKeyword(k, 'only')) {
    only = true;
    k += 1;
  }
  if (k <= last) return null;
  const args = [text(src, tokens, 1, templateEnd)];
  if (variables !== null) args.push(variables);
  if (only) args.push('with_context: false');
  if (ignoreMissing) args.push('ignore_missing: true');
  const [open, close] = delimiters(seg, 'output');
  return `${open} include(${args.join(', ')}) ${close}`;
}

/** `{{ include(…) }}` → `{% include … %}`, or null when there is no exact equivalent. */
function functionToTag(src: string, seg: Segment): string | null {
  const tokens = seg.tokens;
  const last = tokens.length - 1;
  const paren = tokens[1];
  if (tokens[0]?.value !== 'include' || !paren || paren.value !== '(' || paren.match !== last || last < 3) return null;
  const s = analyze(seg);
  const positional: string[] = [];
  const named = new Map<string, string>();
  for (const [a, b] of splitCommas(tokens, 2, last - 1)) {
    const next = tokens[a + 1];
    const isNamed = tokens[a]!.type === 'name' && next !== undefined && a + 1 < b &&
      ((s.colons.get(a + 1) === 'named') || (next.type === 'operator' && next.value === '='));
    if (isNamed) named.set(tokens[a]!.value, text(src, tokens, a + 2, b));
    else if (named.size) return null;
    else positional.push(text(src, tokens, a, b));
  }
  const order = ['template', 'variables', 'with_context', 'ignore_missing', 'sandboxed'];
  const values = new Map<string, string>();
  positional.forEach((v, i) => values.set(order[i] ?? '?', v));
  for (const [key, v] of named) {
    if (values.has(key) || !order.includes(key)) return null;
    values.set(key, v);
  }
  if (values.has('?') || values.has('sandboxed') || !values.has('template')) return null;
  const bool = (key: string, fallback: string): string | null => {
    const v = values.get(key) ?? fallback;
    return v === 'true' || v === 'false' ? v : null;
  };
  const withContext = bool('with_context', 'true');
  const ignoreMissing = bool('ignore_missing', 'false');
  if (withContext === null || ignoreMissing === null) return null;
  let out = `include ${values.get('template')}`;
  if (ignoreMissing === 'true') out += ' ignore missing';
  if (values.has('variables')) out += ` with ${values.get('variables')}`;
  if (withContext === 'false') out += ' only';
  const [open, close] = delimiters(seg, 'block');
  return `${open} ${out} ${close}`;
}

/**
 * Which form of include is allowed: the `include()` function, the `{% include %}` tag, or both. A fix is
 * offered when the other form has an exact equivalent (`only` ↔ `with_context: false`,
 * `ignore missing` ↔ `ignore_missing: true`).
 */
export default createRule<Options>({
  name: 'include-style',
  description: 'Enforce the include() function or the {% include %} tag',
  optionsSchema: { style: { enum: ['both', 'function', 'tag'] } },
  defaultOptions: { style: 'both' },
  messages: {
    useFunction: 'Use the include() function instead of the {% include %} tag.',
    useTag: 'Use the {% include %} tag instead of the include() function.',
  },
  check({ doc, options, report }) {
    if (options.style === 'both') return;
    for (const seg of doc.segments) {
      let replacement: string | null = null;
      if (options.style === 'function' && seg.kind === 'block' && seg.tag === 'include') {
        replacement = tagToFunction(doc.src, seg);
      } else if (options.style === 'tag' && seg.kind === 'output' && seg.tokens[0]?.value === 'include' && seg.tokens[1]?.value === '(' && seg.tokens[1].match === seg.tokens.length - 1) {
        replacement = functionToTag(doc.src, seg);
      } else {
        continue;
      }
      const edits: Edit[] = replacement ? [{ start: seg.start, end: seg.end, text: replacement }] : [];
      report(seg.start, options.style === 'function' ? 'useFunction' : 'useTag', undefined, edits);
    }
  },
});
