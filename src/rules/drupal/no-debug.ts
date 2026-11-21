import { createDebugRule } from '../../util/debug.ts';

/** Debug helpers from Drupal's Devel and Twig Tweak modules should not be committed. */
export default createDebugRule({
  name: 'drupal/no-debug',
  description: 'Disallow debug output from Devel and Twig Tweak, such as kint() and dd()',
  defaults: ['kint', 'ksm', 'kpr', 'dpm', 'dsm', 'devel_dump', 'devel_message', 'devel_breakpoint', 'dd', 'drupal_dump'],
  level: 'warn',
});
