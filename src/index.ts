// eslint-plugin-twig-lint: Twig as an ESLint language, plus rules for formatting and linting.
//
//   import twigLint from 'eslint-plugin-twig-lint';
//   export default [twigLint.configs.recommended];               // any Twig
//   export default [twigLint.configs.recommended, twigLint.configs.drupal];  // Drupal themes and modules

import { TwigLanguage } from './language/twig-language.ts';
import { drupalRules } from './rules/drupal/index.ts';
import { rules as generalRules } from './rules/index.ts';
import type { TwigRuleDefinition } from './util/rule.ts';

export { TwigLanguage } from './language/twig-language.ts';
export { TwigSourceCode, type TwigNode } from './language/twig-source-code.ts';
export type { SharedSettings } from './util/rule.ts';

type Level = 'error' | 'warn';

/** `twig-lint/<id>` → the rule's level in its preset. Opt-in rules (`off`) are left out. */
function presetRules(rules: Record<string, TwigRuleDefinition>): Record<string, Level> {
  const out: Record<string, Level> = {};
  for (const [id, rule] of Object.entries(rules)) {
    const level = rule.meta.docs.level;
    if (level !== 'off') out[`twig-lint/${id}`] = level;
  }
  return out;
}

const rules = { ...generalRules, ...drupalRules };

const plugin = {
  meta: {
    name: 'eslint-plugin-twig-lint',
    version: '0.1.0',
    namespace: 'twig-lint',
  },
  languages: {
    twig: new TwigLanguage(),
  },
  rules,
  configs: {
    /** Parses `**\/*.twig` as Twig and enables the general rules. */
    recommended: {
      name: 'twig-lint/recommended',
      files: ['**/*.twig'],
      plugins: {} as Record<string, unknown>,
      language: 'twig-lint/twig',
      rules: presetRules(generalRules),
    },
    /** Enables the `twig-lint/drupal/*` rules. Use it together with `recommended`. */
    drupal: {
      name: 'twig-lint/drupal',
      files: ['**/*.twig'],
      plugins: {} as Record<string, unknown>,
      language: 'twig-lint/twig',
      rules: presetRules(drupalRules),
    },
  },
};

plugin.configs.recommended.plugins['twig-lint'] = plugin;
plugin.configs.drupal.plugins['twig-lint'] = plugin;

export default plugin;
