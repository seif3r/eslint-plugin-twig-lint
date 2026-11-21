# twig-lint/no-raw

Warn about the `raw` filter, which turns off escaping.

⚠️ `warn` in `recommended`

## Rule details

Twig escapes output by default. `|raw` turns that off, so any HTML or script in the value is rendered as is.
That is an XSS risk unless the value is known to be safe, for example markup that the CMS has already
rendered and filtered.

The rule has no fix. When `|raw` is intended, disable the warning with a comment that says why, or list the
values that are safe in the `allow` option.

## Examples

### ❌ Incorrect

```twig
{{ user_bio|raw }}
```

### ✅ Correct

```twig
{{ user_bio }}
```

```twig
{# eslint-disable-next-line twig-lint/no-raw -- markup rendered and filtered by the layout #}
{{ region_content|raw }}
```

<!-- test-options: {"allow": ["_block_*", "media"]} -->

### ✅ Correct with `allow: ["_block_*", "media"]`

```twig
{{ _block_content|raw }}
{{ media|raw }}
```

## Options

| Option | Default | Description |
|---|---|---|
| `allow` | `[]` | Values where `\|raw` is fine: variable names or dotted paths such as `content.body`, with `*` as a wildcard. Expressions that are not a plain name or path, such as `item.render()\|raw`, are always reported. |

```js
"twig-lint/no-raw": ["warn", { allow: ["_block_*", "media"] }]
```
