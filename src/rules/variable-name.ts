import type { Segment } from '../language/lexer.ts';
import { createRule } from '../util/rule.ts';

const SNAKE_CASE = /^_*[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();
}

/** Names that the template itself creates: `set` targets, loop variables, macros and their arguments, arrow function parameters. */
function definedNames(seg: Segment): Array<{ name: string; pos: number; kind: string }> {
  const out: Array<{ name: string; pos: number; kind: string }> = [];
  const t = seg.tokens;
  const add = (i: number, kind: string): void => {
    const tok = t[i];
    if (tok && tok.type === 'name') out.push({ name: tok.value, pos: tok.start, kind });
  };
  if (seg.kind === 'block' && seg.tag === 'set') {
    for (let i = 1; i < t.length; i++) {
      if (t[i]!.type === 'operator' && t[i]!.value === '=') break;
      add(i, 'variable');
    }
  }
  if (seg.kind === 'block' && seg.tag === 'for') {
    for (let i = 1; i < t.length; i++) {
      if (t[i]!.type === 'name' && t[i]!.value === 'in') break;
      add(i, 'loop variable');
    }
  }
  if (seg.kind === 'block' && seg.tag === 'macro') {
    add(1, 'macro');
    const open = t[2];
    if (open?.value === '(' && open.match !== undefined) {
      for (let i = 3; i < open.match; i++) {
        const prev = t[i - 1]!;
        if (prev.value === '(' || prev.value === ',') add(i, 'macro argument');
        if (t[i]!.match !== undefined) i = t[i]!.match!;
      }
    }
  }
  t.forEach((tok, i) => {
    if (tok.type !== 'operator' || tok.value !== '=>') return;
    const prev = t[i - 1];
    if (prev?.type === 'name') add(i - 1, 'arrow function parameter');
    else if (prev?.value === ')') {
      const open = t.findIndex((x) => x.match === i - 1);
      for (let k = open + 1; k < i - 1; k++) add(k, 'arrow function parameter');
    }
  });
  return out;
}

/** Variables, loop variables, macros, macro arguments and arrow function parameters created in the template use snake_case. */
export default createRule({
  name: 'variable-name',
  description: 'Enforce snake_case for names created in the template',
  type: 'suggestion',
  level: 'warn',
  fixable: false,
  messages: { snake: 'The {{kind}} "{{name}}" should be snake_case: "{{suggestion}}".' },
  check({ doc, report }) {
    for (const seg of doc.segments) {
      for (const { name, pos, kind } of definedNames(seg)) {
        if (!SNAKE_CASE.test(name)) report(pos, 'snake', { kind, name, suggestion: toSnakeCase(name) });
      }
    }
  },
});
