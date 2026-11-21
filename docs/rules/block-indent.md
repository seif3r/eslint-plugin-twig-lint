# twig-lint/block-indent

Enforce indentation of Twig blocks and HTML elements.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

The content of a Twig block (`{% if %}`, `{% for %}`, `{% block %}`, `{% embed %}`, `{% apply %}` …) and of an
HTML element is indented one step from the line that opened it. A line that starts with the closing tag
(`{% endif %}`, `{% else %}`, `</div>`) gets the same indentation as the opening line.

HTML that is opened in one `{% if %}` and closed in a matching sibling `{% if %}` counts as an element, so
everything between the two blocks is indented one step.

The rule never touches the content of `<pre>`, `<textarea>`, `<script>`, `<style>`, `{% trans %}`,
`{% verbatim %}`, multi-line comments, or strings and attribute values that span several lines.

Indentation inside multi-line expressions is handled by [`nested-indent`](nested-indent.md).

## Examples

### Incorrect

```twig
<ul>
{% for item in items %}
<li>{{ item }}</li>
{% endfor %}
</ul>
```

### Correct

```twig
<ul>
  {% for item in items %}
    <li>{{ item }}</li>
  {% endfor %}
</ul>
```

```twig
{% if tag %}
  <{{ tag }}>
{% endif %}

  {{ content }}

{% if tag %}
  </{{ tag }}>
{% endif %}
```

```twig
<div class="example">
  <pre>
Preformatted text
    is never re-indented
</pre>
</div>
```

## Options

| Option | Default | Description |
|---|---|---|
| `indentSize` | `2` | Columns per indentation step |
| `useTabs` | `false` | Indent with tabs instead of spaces |

Both can also be set for all rules in `settings["twig-lint"]`.

```js
"twig-lint/block-indent": ["error", { indentSize: 4 }]
```
