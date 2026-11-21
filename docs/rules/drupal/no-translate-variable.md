# twig-lint/drupal/no-translate-variable

Disallow translating a variable with `|t`.

⚠️ `warn` in `drupal`

## Rule details

Drupal finds translatable strings by scanning templates for string literals followed by `|t` or `|trans`.
When the filter is applied to a variable, the text is not in the template, so it is never extracted and never
translated.

Translate the string where it is created (in PHP, or in a `{% trans %}` block), or use a literal with
placeholders.

## Examples

### ❌ Incorrect

```twig
{{ label|t }}
{{ 'Read more'|upper|t }}
```

### ✅ Correct

```twig
{{ 'Read more'|t }}
{{ 'Hello @name'|t({'@name': name}) }}
{{ label }}
```

## Options

This rule has no options of its own.
