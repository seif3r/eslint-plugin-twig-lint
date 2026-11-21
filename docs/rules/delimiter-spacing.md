# twig-lint/delimiter-spacing

Require exactly one space inside Twig delimiters.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

There is exactly one space after `{{`, `{%` and `{#` and before `}}`, `%}` and `#}`, including the
whitespace-control forms `{{-`, `-}}`, `{%-`, `-%}`, `{{~` and `~}}`. A delimiter followed or preceded by a
newline is left alone, so multi-line tags and comments keep their layout.

## Examples

### Incorrect

```twig
{{item.title}}
{%if is_active%}
  {{-   label   -}}
{%endif%}
{#note#}
```

### Correct

```twig
{{ item.title }}
{% if is_active %}
  {{- label -}}
{% endif %}

{# note #}
```

```twig
{#
  A multi-line comment keeps its layout.
#}
```

## Options

This rule has no options of its own.
