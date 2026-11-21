// Shared helpers for the tests: lint or fix a string with the plugin's presets via ESLint's API.
import { join } from 'node:path';
import { ESLint } from 'eslint';
import plugin from '../src/index.ts';

export const filePath = join(import.meta.dirname, 'x.twig');

function eslint(extra: Record<string, unknown>, fix: boolean): ESLint {
  return new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: true,
    overrideConfig: [plugin.configs.recommended, plugin.configs.drupal, { files: ['**/*.twig'], ...extra }] as ESLint.Options['overrideConfig'],
    fix,
  });
}

export async function lint(text: string, extra: Record<string, unknown> = {}): Promise<ESLint.LintResult['messages']> {
  const [result] = await eslint(extra, false).lintText(text, { filePath });
  return result!.messages;
}

export async function fix(text: string, extra: Record<string, unknown> = {}): Promise<string> {
  const [result] = await eslint(extra, true).lintText(text, { filePath });
  return result!.output ?? text;
}

/** `line:ruleId` for each message, for compact assertions. */
export async function problems(text: string, extra: Record<string, unknown> = {}): Promise<string[]> {
  return (await lint(text, extra)).map((m) => `${m.line}:${m.ruleId ?? 'fatal'}`);
}
