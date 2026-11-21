# twig-lint/final-newline

Require exactly one newline at the end of the file.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

A file ends with exactly one newline. A missing newline is added, and extra empty lines at the end are
removed. Files with Windows line endings get `\r\n`. An empty file is left alone.

## Examples

### Incorrect

```twig
<p>{{ body }}</p>


```

### Correct

```twig
<p>{{ body }}</p>
```

## Options

This rule has no options of its own.
