# twig-lint/single-quotes

Enforce single quotes for Twig strings.

Fixable: yes. Level: `error` in `recommended`.

## Rule details

Strings use single quotes. A string keeps its double quotes when it contains a single quote, or when it uses
interpolation (`"#{…}"`), which only works in double quotes. Escaped double quotes (`\"`) are unescaped when the
string is converted.

Quotes in HTML attributes are not affected, only strings inside `{{ }}` and `{% %}`.

## Examples

### Incorrect

```twig
{{ "Read more"|t }}
{{ "a \"quoted\" word" }}
```

### Correct

```twig
{{ 'Read more'|t }}
{{ 'a "quoted" word' }}
```

```twig
{{ "It's here" }}
{{ "Hello #{name}" }}
```

## Options

This rule has no options of its own.
