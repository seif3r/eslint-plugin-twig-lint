# twig-lint/operator-spacing

Enforce spacing around operators in Twig expressions.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

- One space around binary operators: arithmetic (`+`, `*`, `//` …), comparison (`==`, `<=` …), `~`, `??`,
  `?:`, `=`, `=>`, word operators (`and`, `or`, `in`, `is`, `matches`, `starts with` …) and the `?` and `:` of a
  ternary.
- One space after `not`.
- No space around `.`, `?.`, `|` and `..`, and none after a unary `-` or `+`.

Only spaces within a line are checked. A line break next to an operator, as in a broken filter chain or
`if` condition, is left alone. The colon in hashes and named arguments is handled by
[`hash-spacing`](hash-spacing.md).

## Examples

### Incorrect

```twig
{% set total = price*quantity+shipping %}
{% set name = user . name | upper %}
{{ is_active?'Active':'Inactive' }}
```

### Correct

```twig
{% set total = price * quantity + shipping %}
{% set name = user.name|upper %}
{{ is_active ? 'Active' : 'Inactive' }}
```

```twig
{% set offset = -1 %}
{% set range = 1..5 %}
{% if not (is_hidden or is_draft) %}
  {{ range|join(', ') }}
{% endif %}
```

## Options

This rule has no options of its own.
