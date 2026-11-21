# twig-lint/drupal/no-debug

Disallow debug output from Drupal's Devel and Twig Tweak modules, such as `kint()` and `dd()`.

Fixable: no (the editor offers a suggestion). Level: `warn` in `drupal`.

## Rule details

Debug helpers print variables to the page or the message area while developing. Left in a template, they
show internal data to visitors, slow pages down, or break the page when the module is not installed. They
should not be committed.

By default the rule reports these functions, both called as functions (`kint(x)`) and used as filters
(`x|dd`):

| Name | From |
|---|---|
| `kint`, `ksm`, `kpr`, `dpm`, `dsm`, `devel_dump`, `devel_message`, `devel_breakpoint` | Devel |
| `dd`, `drupal_dump` | Twig Tweak |

Twig's own `dump()` is reported by [`no-debug`](../no-debug.md).

When the tag holds nothing but the debug call, such as `{{ kint(content) }}`, the editor offers to remove it.
Removing debug output is never done by `--fix`, since it can be mixed with output that should stay.

## Examples

### Incorrect

```twig
{{ kint(content) }}
{{ content }}
```

```twig
{{ content|dd }}
```

### Correct

```twig
{{ content }}
```

## Options

| Option | Default | Description |
|---|---|---|
| `additionalFunctions` | `[]` | Debug functions and filters to report in addition to `functions` |
| `functions` | see the table above | The base list. Setting it replaces the default |

```js
"twig-lint/drupal/no-debug": ["warn", { additionalFunctions: ["my_module_debug"] }]
```
