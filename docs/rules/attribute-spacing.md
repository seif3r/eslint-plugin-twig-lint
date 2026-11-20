# twig-lint/attribute-spacing

Enforce a space before attribute output in HTML tags.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended`

## Rule details

Attribute output such as `{{ attributes }}` inside an opening tag is preceded by a space:
`<p{{ attributes }}>` becomes `<p {{ attributes }}>`. This is safe in Drupal, where an `Attribute` object
renders its own leading space; the extra space is collapsed by the browser.

The rule does not touch:

- dynamic tag names such as `<{{ tag }}>`,
- output inside attribute values, such as `class="card {{ modifier }}"`,
- output with whitespace control, such as `<p{{- attributes }}>`.

## Examples

### ❌ Incorrect

```twig
<div{{ attributes }}>
  <a href="{{ url }}"{{ link_attributes }}>{{ label }}</a>
</div>
```

### ✅ Correct

```twig
<div {{ attributes }}>
  <a href="{{ url }}" {{ link_attributes }}>{{ label }}</a>
</div>
```

## Options

| Option | Default | Description |
|---|---|---|
| `mode` | `"space"` | `"space"` requires a space before the output. `"tight"` removes it: `<p{{ attributes }}>` |

```js
"twig-lint/attribute-spacing": ["error", { mode: "tight" }]
```
