# twig-lint/trailing-comma

Enforce trailing commas in multi-line hashes, arrays and arguments.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended`

## Rule details

When the closing bracket of a hash, an array or the arguments of a function, filter, method or macro call
starts its own line, the last item ends with a comma. This keeps diffs small when items are added.

When the closing bracket is on the same line as the last item, including a hugged closing such as
`}, with_context: false) }}`, there is no trailing comma.

Parentheses that group an expression, such as `(a and b)`, and arrow function parameters are not affected.

## Examples

### ❌ Incorrect

```twig
{% set settings = {
  title: title,
  size: 'large'
} %}
{% set sizes = ['small', 'large',] %}
```

### ✅ Correct

```twig
{% set settings = {
  title: title,
  size: 'large',
} %}
{% set sizes = ['small', 'large'] %}
```

```twig
{{ include('theme:card', {
  title: title,
}, with_context: false) }}
```

## Options

| Option | Default | Description |
|---|---|---|
| `multiline` | `true` | `true` requires a trailing comma when the closing bracket is on its own line. `false` disallows it. |

```js
"twig-lint/trailing-comma": ["error", { multiline: false }]
```
