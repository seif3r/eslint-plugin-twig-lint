// Shared by all rules: types for the ESLint context, shared settings and reporting.

import type { Doc } from '../language/parse.ts';
import type { TwigSourceCode } from '../language/twig-source-code.ts';

export interface Edit {
  start: number;
  end: number;
  text: string;
}

/**
 * Shared settings, set in `settings['twig-lint']` in the ESLint config.
 * A rule's own options take precedence.
 */
export interface SharedSettings {
  indentSize: number;
  useTabs: boolean;
  printWidth: number;
}

const DOCS_URL = 'https://github.com/seif3r/eslint-plugin-twig-lint/blob/main/docs/rules';

export const DEFAULT_SETTINGS: SharedSettings = { indentSize: 2, useTabs: false, printWidth: 80 };

interface Fixer {
  replaceTextRange(range: [number, number], text: string): unknown;
}

interface Position {
  line: number;
  column: number;
}

export interface TwigRuleContext {
  sourceCode: TwigSourceCode;
  options: unknown[];
  settings: Record<string, unknown>;
  report(descriptor: {
    loc: { start: Position; end: Position };
    messageId: string;
    data?: Record<string, string | number>;
    fix?: ((fixer: Fixer) => unknown) | null;
  }): void;
}

export interface TwigRuleDefinition {
  meta: {
    type: 'layout' | 'problem' | 'suggestion';
    fixable?: 'whitespace' | 'code';
    docs: { description: string; recommended: boolean; url: string };
    schema: unknown[];
    messages: Record<string, string>;
    language: 'twig-lint/twig';
    defaultOptions?: unknown[];
  };
  create(context: TwigRuleContext): Record<string, (...args: unknown[]) => void>;
}

export interface RuleHelpers<O> {
  doc: Doc;
  settings: SharedSettings;
  options: O;
  /** Reports a problem at position `pos` (offset in the text), with optional edits. */
  report(pos: number, messageId: string, data?: Record<string, string | number>, edits?: Edit[]): void;
}

interface CreateRuleOptions<O> {
  /** Rule id without the plugin prefix, e.g. `attribute-spacing`. */
  name: string;
  description: string;
  type?: 'layout' | 'problem' | 'suggestion';
  fixable?: boolean;
  /** JSON schema for the rule's options (an object). */
  optionsSchema?: Record<string, unknown>;
  defaultOptions?: O;
  messages: Record<string, string>;
  check(helpers: RuleHelpers<O>): void;
}

const SETTINGS_SCHEMA = {
  indentSize: { type: 'integer', minimum: 1 },
  useTabs: { type: 'boolean' },
  printWidth: { type: 'integer', minimum: 20 },
};

export function createRule<O extends object = Record<string, never>>(def: CreateRuleOptions<O>): TwigRuleDefinition {
  return {
    meta: {
      type: def.type ?? 'layout',
      ...(def.fixable === false ? {} : { fixable: 'whitespace' as const }),
      docs: { description: def.description, recommended: true, url: `${DOCS_URL}/${def.name}.md` },
      schema: [{ type: 'object', properties: { ...SETTINGS_SCHEMA, ...def.optionsSchema }, additionalProperties: false }],
      messages: def.messages,
      language: 'twig-lint/twig',
    },
    create(context) {
      return {
        Document() {
          const sc = context.sourceCode;
          const own = (context.options[0] ?? {}) as Partial<SharedSettings> & Partial<O>;
          const shared = (context.settings['twig-lint'] ?? {}) as Partial<SharedSettings>;
          const settings: SharedSettings = { ...DEFAULT_SETTINGS, ...shared };
          for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof SharedSettings>) {
            if (own[key] !== undefined) (settings as unknown as Record<string, unknown>)[key] = own[key];
          }
          const options = { ...def.defaultOptions, ...own } as O;
          def.check({
            doc: sc.doc,
            settings,
            options,
            report(pos, messageId, data, edits) {
              const at = sc.positionAt(pos);
              context.report({
                loc: { start: at, end: at },
                messageId,
                ...(data ? { data } : {}),
                fix: edits?.length
                  ? (fixer) => edits.map((e) => fixer.replaceTextRange([e.start, e.end], e.text))
                  : null,
              });
            },
          });
        },
      };
    },
  };
}
