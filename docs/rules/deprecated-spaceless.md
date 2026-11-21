# twig-lint/deprecated-spaceless

Warn about the deprecated `spaceless` filter.

⚠️ `warn` in `recommended`

## Rule details

`{% apply spaceless %}` and `|spaceless` are deprecated since Twig 3.12, and the `{% spaceless %}` tag was
removed in Twig 3.0. Removing whitespace between tags rarely matters for the rendered page; when it does, use
CSS (for example `display: flex`) or whitespace control (`{%-`, `-%}`) instead.

The rule has no fix, because removing `spaceless` can change the rendered whitespace.

## Examples

### ❌ Incorrect

```twig
{% apply spaceless %}
  <ul class="tabs">
    <li>{{ first }}</li>
    <li>{{ second }}</li>
  </ul>
{% endapply %}
```

### ✅ Correct

```twig
<ul class="tabs">
  <li>{{ first }}</li>
  <li>{{ second }}</li>
</ul>
```

## Options

This rule has no options of its own.
