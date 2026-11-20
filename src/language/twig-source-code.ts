// SourceCode for Twig. Gives ESLint line positions, traversal and disable comments
// ({# eslint-disable-next-line … #}). Rules work on the parser's document model in `doc`.

import { ConfigCommentParser, Directive, TextSourceCodeBase, VisitNodeStep } from '@eslint/plugin-kit';
import type { Doc } from './parse.ts';
import type { Segment } from './lexer.ts';

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface Loc {
  start: Position;
  end: Position;
}

export type TwigNodeType = 'Document' | 'Text' | 'TwigOutput' | 'TwigBlock' | 'TwigComment';

export interface TwigNode {
  type: TwigNodeType;
  loc: Loc;
  range: [number, number];
  children?: TwigNode[];
  /** TwigBlock: the tag name, e.g. `if`. */
  tag?: string;
  /** TwigComment: the text between the delimiters. */
  value?: string;
}

export const visitorKeys: Record<TwigNodeType, string[]> = {
  Document: ['children'],
  Text: [],
  TwigOutput: [],
  TwigBlock: [],
  TwigComment: [],
};

const NODE_TYPE: Record<Segment['kind'], TwigNodeType> = {
  text: 'Text',
  output: 'TwigOutput',
  block: 'TwigBlock',
  comment: 'TwigComment',
};

/** Position with 1-based line and column (the language has `columnStart: 1`). */
export function positionAt(doc: Doc, offset: number): Position {
  const li = doc.lineOf(offset);
  return { line: li + 1, column: offset - doc.lines[li]!.start + 1, offset };
}

export function buildAst(doc: Doc): TwigNode {
  const node = (type: TwigNodeType, start: number, end: number): TwigNode => ({
    type,
    range: [start, end],
    loc: { start: positionAt(doc, start), end: positionAt(doc, end) },
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

const commentParser = new ConfigCommentParser();
const INLINE_CONFIG = /^\s*eslint(?:-enable|-disable(?:(?:-next)?-line)?)?(?:\s|$)/u;
const DIRECTIVES = new Set(['eslint-disable', 'eslint-enable', 'eslint-disable-next-line', 'eslint-disable-line']);

type DirectiveType = 'disable' | 'enable' | 'disable-next-line' | 'disable-line';

interface InlineProblem {
  ruleId: null;
  message: string;
  loc: Loc;
}

class TwigTraversalStep extends VisitNodeStep {
  declare target: TwigNode;
}

export class TwigSourceCode extends TextSourceCodeBase<{
  LangOptions: Record<string, never>;
  RootNode: TwigNode;
  SyntaxElementWithLoc: TwigNode;
  ConfigNode: TwigNode;
}> {
  /** The parser's document model. */
  readonly doc: Doc;
  #parents = new WeakMap<TwigNode, TwigNode | undefined>();
  #steps: TwigTraversalStep[] | undefined;

  constructor({ text, ast, doc }: { text: string; ast: TwigNode; doc: Doc }) {
    super({ text, ast, lineEndingPattern: /\r?\n/u });
    this.doc = doc;
  }

  override getRange(node: TwigNode): [number, number] {
    return node.range;
  }

  override getLoc(node: TwigNode): Loc {
    return node.loc;
  }

  positionAt(offset: number): Position {
    return positionAt(this.doc, offset);
  }

  get comments(): TwigNode[] {
    return (this.ast.children ?? []).filter((n) => n.type === 'TwigComment');
  }

  getInlineConfigNodes(): TwigNode[] {
    return this.comments.filter((c) => INLINE_CONFIG.test(c.value ?? ''));
  }

  getDisableDirectives(): { problems: InlineProblem[]; directives: Directive[] } {
    const problems: InlineProblem[] = [];
    const directives: Directive[] = [];
    for (const comment of this.getInlineConfigNodes()) {
      const parsed = commentParser.parseDirective(comment.value ?? '');
      if (!parsed || !DIRECTIVES.has(parsed.label)) continue;
      const { label, value, justification } = parsed;
      if (label === 'eslint-disable-line' && comment.loc.start.line !== comment.loc.end.line) {
        problems.push({ ruleId: null, message: `${label} comment should not span multiple lines.`, loc: comment.loc });
        continue;
      }
      directives.push(new Directive({
        type: label.slice('eslint-'.length) as DirectiveType,
        node: comment,
        value,
        justification,
      }));
    }
    return { problems, directives };
  }

  applyInlineConfig(): { configs: Array<{ config: { rules: unknown }; loc: Loc }>; problems: InlineProblem[] } {
    const configs: Array<{ config: { rules: unknown }; loc: Loc }> = [];
    const problems: InlineProblem[] = [];
    for (const comment of this.getInlineConfigNodes()) {
      const parsed = commentParser.parseDirective(comment.value ?? '');
      if (!parsed || parsed.label !== 'eslint') continue;
      const result = commentParser.parseJSONLikeConfig(parsed.value);
      if (result.ok) configs.push({ config: { rules: result.config }, loc: comment.loc });
      else problems.push({ ruleId: null, message: result.error.message, loc: comment.loc });
    }
    return { configs, problems };
  }

  override getParent(node: TwigNode): TwigNode | undefined {
    return this.#parents.get(node);
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
