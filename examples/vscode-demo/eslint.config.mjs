// Demo: eslint-plugin-twig-lint in VS Code via the ESLint extension (dbaeumer.vscode-eslint).
import twigLint from '../../src/index.ts';

export default [
  twigLint.configs.recommended,
  {
    files: ['**/*.twig'],
    settings: { 'twig-lint': { indentSize: 2, printWidth: 80 } },
  },
];
