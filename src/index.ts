// eslint-plugin-twig-lint: Twig as an ESLint language, plus rules for formatting and linting.
//
//   import twigLint from 'eslint-plugin-twig-lint';
//   export default [twigLint.configs.recommended];

import { TwigLanguage } from './language/twig-language.ts';
import { rules } from './rules/index.ts';

export { TwigLanguage } from './language/twig-language.ts';
export { TwigSourceCode, type TwigNode } from './language/twig-source-code.ts';
export type { SharedSettings } from './util/rule.ts';

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
    recommended: {
      name: 'twig-lint/recommended',
      files: ['**/*.twig'],
      plugins: {} as Record<string, unknown>,
      language: 'twig-lint/twig',
      rules: Object.fromEntries(Object.keys(rules).map((id) => [`twig-lint/${id}`, 'error'])) as Record<string, 'error'>,
    },
  },
};

plugin.configs.recommended.plugins['twig-lint'] = plugin;

export default plugin;
