# twig-lint/empty-lines

Allow at most one empty line in a row.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

Two or more empty lines in a row are reduced to one. Lines inside `<pre>`, `<textarea>`, `<script>`,
`<style>`, `{% trans %}`, `{% verbatim %}` and multi-line strings are left alone.

## Examples

### Incorrect

```twig
<h2>{{ title }}</h2>



<p>{{ body }}</p>
```

### Correct

```twig
<h2>{{ title }}</h2>

<p>{{ body }}</p>
```

## Options

This rule has no options of its own.
