# twig-lint/punctuation-spacing

Enforce spacing around commas and inside brackets in Twig expressions.

🔧 Fixable with `--fix` · ✅ Enabled in `recommended`

## Rule details

- One space after a comma and none before it.
- No space just inside `(`, `[` and `{`, or just before `)`, `]` and `}`.

Only spaces within a line are checked, so multi-line hashes, arrays and arguments keep their layout.

## Examples

### ❌ Incorrect

```twig
{% set sizes = [ 'small' , 'medium' ,'large' ] %}
{{ dump(  ) }}
{{ include( 'theme:button' ) }}
```

### ✅ Correct

```twig
{% set sizes = ['small', 'medium', 'large'] %}
{{ dump() }}
{{ include('theme:button') }}
```

## Options

This rule has no options of its own.
