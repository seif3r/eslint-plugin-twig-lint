# twig-lint/drupal/no-translate-variable

Disallow translating a variable with `|t`.

Fixable: no. Level: `warn` in `drupal`.

## Rule details

Translation tools find translatable strings by scanning templates for string literals followed by `|t` or
`|trans`: translation files, `potx` and localize.drupal.org. When the filter is applied to a variable, the
text is not in the template, so these tools cannot find it.

The filter still works at runtime. When Drupal's Locale module gets a string it has no translation for, it
saves it as a source string, and someone can translate it under *Interface translation*. Until the string has
been rendered once and translated, it shows untranslated, and it is not part of any translation file.

What to do instead depends on where the value comes from:

- **Text written in the template or in code:** use a literal, with placeholders for the dynamic parts, or
  translate it in PHP before it reaches the template.
- **Content, such as a taxonomy term name or a field value:** use content translation for the entity itself,
  and print the value without `|t`.
- **A fixed set of values that your team translates in the interface on purpose:** disable the warning on that
  line with a comment that says why, or turn the rule off.

## Examples

### Incorrect

```twig
{{ label|t }}
{{ 'Read more'|upper|t }}
```

### Correct

```twig
{{ 'Read more'|t }}
{{ 'Hello @name'|t({'@name': name}) }}
{{ label }}
```

## Options

This rule has no options of its own.
