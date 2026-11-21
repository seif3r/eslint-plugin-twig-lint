# twig-lint/no-debug

Disallow Twig's `dump()` debug output.

Fixable: no (the editor offers a suggestion). Level: `warn` in `recommended`.

## Rule details

`dump()` prints variables while developing. Left in a template, it shows internal data to visitors when debug
mode is on, and prints nothing when it is off. It should not be committed.

By default the rule reports Twig's `dump`. Add your project's own debug helpers with `additionalFunctions`.
Both function calls (`dump(x)`) and filters (`x|my_debug`) are reported. Debug helpers from Drupal modules
are reported by [`drupal/no-debug`](drupal/no-debug.md).

When the tag holds nothing but the debug call, such as `{{ dump(item) }}`, the editor offers to remove it.
Removing debug output is never done by `--fix`, since it can be mixed with output that should stay.

## Examples

### Incorrect

```twig
{{ dump(item) }}
<p>{{ item.title }}</p>
```

### Correct

```twig
<p>{{ item.title }}</p>
```

<!-- test-options: {"additionalFunctions": ["trace"]} -->

### Incorrect with `additionalFunctions: ["trace"]`

```twig
{{ trace(item) }}
<p>{{ item.title }}</p>
```

### Correct with `additionalFunctions: ["trace"]`

```twig
<p>{{ item.title }}</p>
```

## Options

| Option | Default | Description |
|---|---|---|
| `additionalFunctions` | `[]` | Debug functions and filters to report in addition to `functions` |
| `functions` | `["dump"]` | The base list. Setting it replaces the default |

```js
"twig-lint/no-debug": ["warn", { additionalFunctions: ["trace", "my_debug"] }]
```
