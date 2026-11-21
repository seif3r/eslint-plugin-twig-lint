# twig-lint/defined-check

Simplify or require `is defined` before `is not empty`.

Fixable: no (the editor offers a suggestion). Level: `warn` in `recommended`.

## Rule details

`x is defined and x is not empty` is a common guard. When Twig's `strict_variables` is off, which is
Drupal's default, an undefined variable is `null`, so `x is not empty` alone gives the same result.

- `mode: "simplify"` (default) reports `x is defined and x is not empty` and suggests `x is not empty`.
- `mode: "require"` does the opposite: `x is not empty` must be preceded by `x is defined and`. Use it when
  templates run with `strict_variables`, where using an undefined variable is an error.
- `mode: "allow"` reports nothing.

The change is offered as a suggestion in the editor and is never applied by `--fix` or formatting, since
whether it is safe depends on how Twig is configured.

## Examples

### Incorrect

```twig
{% if title is defined and title is not empty %}
  <h2>{{ title }}</h2>
{% endif %}
```

### Correct

```twig
{% if title is not empty %}
  <h2>{{ title }}</h2>
{% endif %}
```

<!-- test-options: {"mode": "require"} -->

### Incorrect with `mode: "require"`

```twig
{% if page.title is not empty %}
  <h2>{{ page.title }}</h2>
{% endif %}
```

### Correct with `mode: "require"`

```twig
{% if page.title is defined and page.title is not empty %}
  <h2>{{ page.title }}</h2>
{% endif %}
```

## Options

| Option | Default | Description |
|---|---|---|
| `mode` | `"simplify"` | `"simplify"`, `"require"` or `"allow"` |
