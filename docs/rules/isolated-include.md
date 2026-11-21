# twig-lint/isolated-include

Require includes to be isolated from the calling template.

⚠️ `warn` in `recommended` · 💡 Has suggestions

## Rule details

By default, an included template sees every variable of the template that includes it. That makes a
component depend on where it is used, and a variable with the same name can leak into it by accident. This
rule asks for isolated includes:

- `include()` passes `with_context: false`,
- `{% include %}` ends with `only`,
- `{% embed %}` ends with `only`, but only with the option `embed: true`. Blocks in an embed often use the
  caller's variables, so this is off by default.

The rule has no automatic fix, because isolating an include can break a template that relies on the
caller's variables. Editors offer a suggestion that adds `with_context: false` or `only`.

## Examples

### ❌ Incorrect

```twig
{{ include('theme:card', {title: title}) }}
```

```twig
{% include 'theme:card' with {title: title} %}
```

### ✅ Correct

```twig
{{ include('theme:card', {title: title}, with_context: false) }}
```

```twig
{% include 'theme:card' with {title: title} only %}
```

<!-- test-options: {"embed": true} -->

### ❌ Incorrect with `embed: true`

```twig
{% embed 'theme:card' %}
  {% block body %}
    {{ body }}
  {% endblock body %}
{% endembed %}
```

### ✅ Correct with `embed: true`

```twig
{% embed 'theme:card' only %}
  {% block body %}
    {{ body }}
  {% endblock body %}
{% endembed %}
```

## Options

| Option | Default | Description |
|---|---|---|
| `embed` | `false` | Also require `only` on `{% embed %}` |
