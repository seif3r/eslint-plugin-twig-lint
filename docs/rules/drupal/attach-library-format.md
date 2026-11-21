# twig-lint/drupal/attach-library-format

Enforce the `extension/library` format in `attach_library()`.

❗ `error` in `drupal`

## Rule details

`attach_library()` takes the name of a library defined in an extension's `*.libraries.yml`, written as
`extension/library`, for example `my_theme/slider`. A name with a colon, such as `my_theme:button`, is the
ID of a Single Directory Component. Components load their own CSS and JS, so they are not attached this way.

Only string literals are checked.

## Examples

### ❌ Incorrect

```twig
{{ attach_library('my_theme:button') }}
{{ attach_library('slider') }}
```

### ✅ Correct

```twig
{{ attach_library('my_theme/slider') }}
{{ attach_library('core/drupal.dialog.ajax') }}
```

## Options

This rule has no options of its own.
