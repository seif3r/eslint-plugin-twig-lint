// Runs `eslint --fix` with the plugin's recommended config on a file anywhere on disk.
// Used by the golden suite: node test/run.mjs --cmd "node …/eslint-fix.ts {file}"
import { dirname, resolve } from 'node:path';
import { ESLint } from 'eslint';
import plugin from '../src/index.ts';

const files = process.argv.slice(2).map((f) => resolve(f));
const eslint = new ESLint({
  cwd: dirname(files[0]!),
  overrideConfigFile: true,
  overrideConfig: plugin.configs.recommended as ESLint.Options['overrideConfig'],
  fix: !process.env.NO_FIX,
});
const results = await eslint.lintFiles(files);
await ESLint.outputFixes(results);
const formatter = await eslint.loadFormatter('stylish');
const out = await formatter.format(results);
if (out) console.log(out);
process.exitCode = results.some((r) => r.errorCount > 0) ? 1 : 0;
