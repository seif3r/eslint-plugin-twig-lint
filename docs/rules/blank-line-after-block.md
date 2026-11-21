# twig-lint/blank-line-after-block

Require an empty line after a closing block tag.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

A line that contains only a closing block tag (`{% endif %}`, `{% endfor %}`, `{% endblock %}`,
`{% endembed %}`, `{% endapply %}`, `{% endmacro %}` …) is followed by an empty line. This makes the end of a
block easy to see.

No empty line is needed when the next line that is not empty:

- is another closing tag, `{% else %}` or `{% elseif %}`,
- starts with a closing HTML tag `</…>`,
- ends a tag or expression (`>`, `)`, `}`, `%}`, `}}`), for example `{% endif %}` between attributes,
- does not exist, because the file ends.

The extra newline does not change the rendered page. The rule does not apply inside `<pre>` or `<textarea>`.

## Examples

### Incorrect

```twig
{% if title %}
  <h2>{{ title }}</h2>
{% endif %}
<p>{{ body }}</p>
```

### Correct

```twig
{% if title %}
  <h2>{{ title }}</h2>
{% endif %}

<p>{{ body }}</p>
```

```twig
<ul>
  {% for item in items %}
    {% if item.visible %}
      <li>{{ item.label }}</li>
    {% endif %}
  {% endfor %}
</ul>
```

## Options

This rule has no options of its own.
