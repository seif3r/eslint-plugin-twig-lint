# twig-lint/hash-spacing

Enforce spacing around the colon in hashes and named arguments.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

In a hash (`{key: value}`) and in a named argument (`with_context: false`), there is no space before the colon
and one space after it. The colon of a ternary is handled by [`operator-spacing`](operator-spacing.md).

## Examples

### Incorrect

```twig
{% set config = {title : title, size:'large'} %}
{{ include('theme:card', config, with_context:false) }}
```

### Correct

```twig
{% set config = {title: title, size: 'large'} %}
{{ include('theme:card', config, with_context: false) }}
```

## Options

This rule has no options of its own.
