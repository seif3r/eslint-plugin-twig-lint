# twig-lint/no-debug

Disallow debug output such as `dump()` and `kint()`.

Fixable: no (the editor offers a suggestion). Level: `warn` in `recommended`.

## Rule details

Debug helpers print variables to the page or the message area while developing. Left in a template, they
show internal data to visitors, slow pages down, or do nothing at all when debug mode is off. They should not
be committed.

By default the rule reports these functions, both called as functions (`dump(x)`) and used as filters
(`x|dd`):

| Name | From |
|---|---|
| `dump` | Twig (debug extension) |
| `kint`, `ksm`, `kpr`, `dpm`, `dsm`, `devel_dump`, `devel_message`, `devel_breakpoint` | Drupal's Devel module |
| `dd`, `drupal_dump` | Drupal's Twig Tweak module |

When the tag holds nothing but the debug call, such as `{{ dump(item) }}`, the editor offers to remove it.
Removing debug output is never done by `--fix`, since it can be mixed with output that should stay.

## Examples

### Incorrect

```twig
{{ dump(item) }}
<p>{{ item.title }}</p>
```

```twig
{{ kint(content) }}
{{ content }}
```

```twig
{{ content|dd }}
```

### Correct

```twig
<p>{{ item.title }}</p>
```

```twig
{{ content }}
```

## Options

| Option | Default | Description |
|---|---|---|
| `functions` | see the table above | Debug functions and filters to report. Replaces the default list. |

```js
"twig-lint/no-debug": ["warn", { functions: ["dump", "kint", "my_debug"] }]
```
