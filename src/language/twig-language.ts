// The ESLint language for Twig. Used in config as `language: 'twig-lint/twig'`.

import { lineAt, TwigParseError } from './lexer.ts';
import { parse, type Doc } from './parse.ts';
import { buildAst, TwigSourceCode, visitorKeys, type TwigNode } from './twig-source-code.ts';

interface File {
  body: string | Uint8Array;
  path: string;
}

export interface TwigParseOk {
  ok: true;
  ast: TwigNode;
  doc: Doc;
}

export interface TwigParseFail {
  ok: false;
  errors: Array<{ message: string; line: number; column: number }>;
}

export class TwigLanguage {
  readonly fileType = 'text';
  readonly lineStart = 1;
  readonly columnStart = 1;
  readonly nodeTypeKey = 'type';
  readonly visitorKeys = visitorKeys;
  readonly defaultLanguageOptions = {};

  /**
   * Twig has no language options. Options meant for other languages are ignored rather than rejected:
   * configs without `files`, such as `js.configs.recommended`, pass their JavaScript options
   * (`ecmaVersion`, `sourceType` …) to every file ESLint lints, including `.twig` files.
   */
  validateLanguageOptions(_options: Record<string, unknown>): void {}

  parse(file: File): TwigParseOk | TwigParseFail {
    const text = String(file.body);
    try {
      const doc = parse(text);
      return { ok: true, ast: buildAst(doc), doc };
    } catch (e) {
      if (!(e instanceof TwigParseError)) throw e;
      const line = lineAt(text, e.offset);
      const column = e.offset - (text.lastIndexOf('\n', e.offset - 1) + 1) + 1;
      return { ok: false, errors: [{ message: e.message, line, column }] };
    }
  }

  createSourceCode(file: File, result: TwigParseOk): TwigSourceCode {
    return new TwigSourceCode({ text: String(file.body), ast: result.ast, doc: result.doc });
  }
}
