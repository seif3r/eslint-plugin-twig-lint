import attachLibraryFormat from './attach-library-format.ts';
import componentReference from './component-reference.ts';
import noTranslateVariable from './no-translate-variable.ts';

/** Drupal-only rules, registered as `twig-lint/drupal/<name>` and enabled by `configs.drupal`. */
export const drupalRules = {
  'drupal/attach-library-format': attachLibraryFormat,
  'drupal/component-reference': componentReference,
  'drupal/no-translate-variable': noTranslateVariable,
};
