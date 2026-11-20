// Demo: eslint-plugin-twig-lint i VS Code via ESLint-tillägget (dbaeumer.vscode-eslint).
import twigLint from '../../packages/eslint-plugin-twig-lint/src/index.ts';

export default [
  ...twigLint.configs.recommended,
  {
    files: ['**/*.twig'],
    settings: { 'twig-lint': { indentSize: 2, printWidth: 80 } },
  },
];
