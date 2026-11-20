// eslint-plugin-twig-lint (proof of concept)
//
// Ett ESLint-språk för Twig plus ESLint-regler. Parsern och regellogiken kommer från core-paketet.
// ESLint står för motorn: konfiguration, nivåer, avstängningskommentarer, fix-loop, CLI och utdata.

import { ConfigCommentParser, Directive, TextSourceCodeBase, VisitNodeStep } from '@eslint/plugin-kit';
import { parse, type Doc } from '../../core/src/parse.ts';
import { TwigParseError, lineAt, type Segment } from '../../core/src/lexer.ts';
import { resolveOptions, type PartialOptions } from '../../core/src/config.ts';
import { RULES } from '../../core/src/engine.ts';
import type { Rule as CoreRule, RuleMeta } from '../../core/src/rule.ts';

// ---------------------------------------------------------------------------------------------
// AST

interface Position {
  line: number;
  column: number;
  offset: number;
}

interface Loc {
  start: Position;
  end: Position;
}

export interface TwigNode {
  type: 'Document' | 'Text' | 'TwigOutput' | 'TwigBlock' | 'TwigComment';
  loc: Loc;
  range: [number, number];
  children?: TwigNode[];
  /** TwigBlock: taggnamnet. */
  tag?: string;
  /** TwigComment: texten mellan avgränsarna. */
  value?: string;
}

const visitorKeys: Record<string, string[]> = {
  Document: ['children'],
  Text: [],
  TwigOutput: [],
  TwigBlock: [],
  TwigComment: [],
};

const NODE_TYPE: Record<Segment['kind'], TwigNode['type']> = {
  text: 'Text',
  output: 'TwigOutput',
  block: 'TwigBlock',
  comment: 'TwigComment',
};

function locator(doc: Doc): (offset: number) => Position {
  return (offset) => {
    const li = doc.lineOf(offset);
    return { line: li + 1, column: offset - doc.lines[li]!.start + 1, offset };
  };
}

function buildAst(doc: Doc): TwigNode {
  const at = locator(doc);
  const node = (type: TwigNode['type'], start: number, end: number): TwigNode => ({
    type, range: [start, end], loc: { start: at(start), end: at(end) },
  });
  const root = node('Document', 0, doc.src.length);
  root.children = doc.segments.map((seg) => {
    const n = node(NODE_TYPE[seg.kind], seg.start, seg.end);
    if (seg.kind === 'block') n.tag = seg.tag;
    if (seg.kind === 'comment') n.value = doc.src.slice(seg.innerStart, seg.closeStart);
    return n;
  });
  return root;
}

// ---------------------------------------------------------------------------------------------
// SourceCode

const commentParser = new ConfigCommentParser();
const INLINE_CONFIG = /^\s*eslint(?:-enable|-disable(?:(?:-next)?-line)?)?(?:\s|$)/u;

class TwigTraversalStep extends VisitNodeStep {
  override target: TwigNode;
  constructor(options: { target: TwigNode; phase: 1 | 2; args: unknown[] }) {
    super(options);
    this.target = options.target;
  }
}

export class TwigSourceCode extends TextSourceCodeBase {
  override ast: TwigNode;
  /** Core-paketets dokumentmodell. Reglerna arbetar mot den. */
  doc: Doc;
  #parents = new WeakMap<TwigNode, TwigNode | undefined>();
  #steps: TwigTraversalStep[] | undefined;

  constructor({ text, ast, doc }: { text: string; ast: TwigNode; doc: Doc }) {
    super({ text, ast, lineEndingPattern: /\r?\n/u });
    this.ast = ast;
    this.doc = doc;
  }

  override getRange(node: object): [number, number] {
    return (node as TwigNode).range;
  }

  get comments(): TwigNode[] {
    return (this.ast.children ?? []).filter((n) => n.type === 'TwigComment');
  }

  getInlineConfigNodes(): TwigNode[] {
    return this.comments.filter((c) => INLINE_CONFIG.test(c.value ?? ''));
  }

  getDisableDirectives() {
    const problems: Array<{ ruleId: null; message: string; loc: Loc }> = [];
    const directives: Directive[] = [];
    for (const comment of this.getInlineConfigNodes()) {
      const parsed = commentParser.parseDirective(comment.value ?? '');
      if (!parsed) continue;
      const { label, value, justification } = parsed;
      if (label === 'eslint-disable-line' && comment.loc.start.line !== comment.loc.end.line) {
        problems.push({ ruleId: null, message: `${label} comment should not span multiple lines.`, loc: comment.loc });
        continue;
      }
      if (['eslint-disable', 'eslint-enable', 'eslint-disable-next-line', 'eslint-disable-line'].includes(label)) {
        directives.push(new Directive({
          type: label.slice('eslint-'.length) as 'disable' | 'enable' | 'disable-next-line' | 'disable-line',
          node: comment,
          value,
          justification,
        }));
      }
    }
    return { problems, directives };
  }

  applyInlineConfig() {
    const configs: Array<{ config: { rules: unknown }; loc: Loc }> = [];
    const problems: Array<{ ruleId: null; message: string; loc: Loc }> = [];
    for (const comment of this.getInlineConfigNodes()) {
      const parsed = commentParser.parseDirective(comment.value ?? '');
      if (!parsed || parsed.label !== 'eslint') continue;
      const result = commentParser.parseJSONLikeConfig(parsed.value);
      if (result.ok) configs.push({ config: { rules: result.config }, loc: comment.loc });
      else problems.push({ ruleId: null, message: result.error.message, loc: comment.loc });
    }
    return { configs, problems };
  }

  override getParent(node: object): TwigNode | undefined {
    return this.#parents.get(node as TwigNode);
  }

  override traverse(): Iterable<TwigTraversalStep> {
    if (this.#steps) return this.#steps.values();
    const steps: TwigTraversalStep[] = (this.#steps = []);
    const visit = (node: TwigNode, parent?: TwigNode): void => {
      this.#parents.set(node, parent);
      steps.push(new TwigTraversalStep({ target: node, phase: 1, args: [node, parent] }));
      for (const child of node.children ?? []) visit(child, node);
      steps.push(new TwigTraversalStep({ target: node, phase: 2, args: [node, parent] }));
    };
    visit(this.ast);
    return steps;
  }
}

// ---------------------------------------------------------------------------------------------
// Language

interface ParseOk {
  ok: true;
  ast: TwigNode;
  doc: Doc;
}

export class TwigLanguage {
  fileType = 'text' as const;
  lineStart = 1 as const;
  columnStart = 1 as const;
  nodeTypeKey = 'type';
  visitorKeys = visitorKeys;
  defaultLanguageOptions = {};

  validateLanguageOptions(): void {}

  parse(file: { body: string | Uint8Array }) {
    const text = String(file.body);
    try {
      const doc = parse(text);
      return { ok: true, ast: buildAst(doc), doc } satisfies ParseOk;
    } catch (e) {
      if (!(e instanceof TwigParseError)) throw e;
      const line = lineAt(text, e.offset);
      const column = e.offset - (text.lastIndexOf('\n', e.offset - 1) + 1) + 1;
      return { ok: false as const, errors: [{ message: e.message, line, column }] };
    }
  }

  createSourceCode(file: { body: string | Uint8Array }, result: ParseOk): TwigSourceCode {
    return new TwigSourceCode({ text: String(file.body), ast: result.ast, doc: result.doc });
  }
}

// ---------------------------------------------------------------------------------------------
// Regler: varje core-regel blir en ESLint-regel.

interface RuleContext {
  sourceCode: TwigSourceCode;
  options: unknown[];
  settings: Record<string, unknown>;
  report(descriptor: {
    loc: { start: { line: number; column: number }; end: { line: number; column: number } };
    message: string;
    fix?: (fixer: Fixer) => unknown;
  }): void;
}

interface Fixer {
  replaceTextRange(range: [number, number], text: string): unknown;
}

function toEslintRule(core: CoreRule, meta: RuleMeta) {
  return {
    meta: {
      type: 'layout',
      fixable: meta.fixable ? 'whitespace' : undefined,
      docs: { description: meta.description },
      schema: [{ type: 'object', additionalProperties: true }],
      language: 'twig-lint/twig',
    },
    create(context: RuleContext) {
      return {
        Document() {
          const sc = context.sourceCode;
          const ruleOptions = (context.options[0] ?? {}) as Record<string, unknown>;
          // Gemensamma inställningar (indentSize, printWidth …) i `settings['twig-lint']`, regelns egna ovanpå.
          const options = resolveOptions(context.settings['twig-lint'] as PartialOptions | undefined, ruleOptions as PartialOptions);
          const at = locator(sc.doc);
          for (const f of core.run({ doc: sc.doc, options, ruleOptions: () => ruleOptions })) {
            if (f.ruleId !== meta.id) continue;
            const pos = at(f.pos);
            const edits = f.edits ?? [];
            context.report({
              loc: { start: pos, end: pos },
              message: f.message,
              fix: edits.length ? (fixer) => edits.map((e) => fixer.replaceTextRange([e.start, e.end], e.text)) : undefined,
            });
          }
        },
      };
    },
  };
}

const rules: Record<string, ReturnType<typeof toEslintRule>> = {};
for (const core of RULES) {
  for (const meta of core.rules) rules[meta.id] = toEslintRule(core, meta);
}

const plugin = {
  meta: { name: 'eslint-plugin-twig-lint', version: '0.0.1' },
  languages: { twig: new TwigLanguage() },
  rules,
  configs: {} as Record<string, unknown>,
};

plugin.configs.recommended = [
  {
    name: 'twig-lint/recommended',
    files: ['**/*.twig'],
    plugins: { 'twig-lint': plugin },
    language: 'twig-lint/twig',
    rules: Object.fromEntries(Object.keys(rules).map((id) => [`twig-lint/${id}`, 'error'])),
  },
];

export default plugin;
