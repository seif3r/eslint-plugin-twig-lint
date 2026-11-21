import { createDebugRule } from '../util/debug.ts';

/** Twig's own debug output, `{{ dump(x) }}`, should not be committed. Drupal's helpers are in `drupal/no-debug`. */
export default createDebugRule({
  name: 'no-debug',
  description: "Disallow Twig's dump() debug output",
  defaults: ['dump'],
  level: 'warn',
});
