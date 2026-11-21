# twig-lint/drupal/component-reference

Include components by their SDC ID instead of a file path.

Opt-in: not enabled by `drupal`. Turn it on in your own config:

```js
"twig-lint/drupal/component-reference": "warn"
```

## Rule details

A Single Directory Component can be included by its ID (`provider:component`) or by the path to its Twig
file. Only the ID lets Drupal attach the component's CSS and JS and validate its props, so the ID is the
better choice.

The rule reports `include()`, `{% include %}` and `{% embed %}` with a template path that points into a
`components/` folder and ends with `.twig`. Other templates, such as `block.html.twig`, are not affected.
There is no fix, because the rule cannot know which ID a path belongs to.

## Examples

### ❌ Incorrect

```twig
{{ include('@my_theme/components/card/card.twig', {title: title}, with_context: false) }}
```

### ✅ Correct

```twig
{{ include('my_theme:card', {title: title}, with_context: false) }}
```

```twig
{% extends 'block.html.twig' %}
```

## Options

This rule has no options of its own.
