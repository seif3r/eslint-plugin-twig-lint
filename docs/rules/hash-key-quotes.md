# twig-lint/hash-key-quotes

Disallow unnecessary quotes around hash keys.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

A hash key that is a plain identifier (letters, digits and `_`, not starting with a digit) does not need
quotes: `{'class': x}` is the same as `{class: x}`. Keys such as `'aria-label'`, `'data-id'` or `'0'` need
their quotes and are left alone.

## Examples

### Incorrect

```twig
{% set config = {'title': title, "size": 'large'} %}
```

### Correct

```twig
{% set config = {title: title, size: 'large'} %}
```

```twig
{% set attributes = {'aria-label': label, 'data-id': id} %}
```

## Options

This rule has no options of its own.
