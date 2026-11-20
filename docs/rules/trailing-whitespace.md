# twig-lint/trailing-whitespace

Disallow whitespace at the end of lines.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended`

## Rule details

Spaces and tabs at the end of a line are removed. Whitespace that is part of the content is left alone: inside
`<pre>`, `<textarea>`, `<script>`, `<style>`, `{% trans %}`, `{% verbatim %}`, multi-line strings and
multi-line attribute values.

## Examples

### ❌ Incorrect

```twig
<p>{{ body }}</p>   
{% if footer %}  
  {{ footer }}
{% endif %}
```

### ✅ Correct

```twig
<p>{{ body }}</p>
{% if footer %}
  {{ footer }}
{% endif %}
```

## Options

This rule has no options of its own.
