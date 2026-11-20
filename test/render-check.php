<?php
// Checks that input.twig and expected.twig produce the same page in a browser.
//
// Usage:
//   TWIG_AUTOLOAD=<project>/vendor/autoload.php php test/render-check.php test/fixtures/<name> [...]
//
// Both files are rendered with Twig (Drupal functions and filters are stubbed, and all variables
// are set to simple test values). Then the HTML trees are compared: element names, attributes and text.
// Text is compared with whitespace collapsed as in HTML, except in pre/textarea where it must match exactly.
// Each fixture is rendered with the flags both true and false.

ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);
require getenv('TWIG_AUTOLOAD') ?: exit("Set TWIG_AUTOLOAD to a vendor/autoload.php that includes twig/twig\n");

final class AnyLoader implements \Twig\Loader\LoaderInterface {
  public array $t = [];
  public function getSourceContext(string $n): \Twig\Source { return new \Twig\Source($this->t[$n] ?? '', $n); }
  public function getCacheKey(string $n): string { return $n . md5($this->t[$n] ?? ''); }
  public function isFresh(string $n, int $time): bool { return false; }
  public function exists(string $n): bool { return true; }
}

function env(AnyLoader $l): \Twig\Environment {
  $t = new \Twig\Environment($l, ['autoescape' => false]);
  $t->registerUndefinedFunctionCallback(fn($n) => new \Twig\TwigFunction($n, fn(...$a) => str_contains($n, 'attribute') ? ' data-fn="' . $n . '"' : "[$n]"));
  $t->registerUndefinedFilterCallback(fn($n) => new \Twig\TwigFilter($n, fn($x) => $x));
  $t->addTokenParser(new class extends \Twig\TokenParser\AbstractTokenParser {
    public function parse(\Twig\Token $tok): \Twig\Node\Node {
      $s = $this->parser->getStream(); $s->expect(\Twig\Token::BLOCK_END_TYPE);
      $body = $this->parser->subparse(fn($t) => $t->test('endtrans'), true);
      $s->expect(\Twig\Token::BLOCK_END_TYPE); return $body; }
    public function getTag(): string { return 'trans'; } });
  return $t;
}

function context(bool $flag): array {
  $v = $flag ? 'v' : '';
  $attrs = fn(string $c) => new class($c) {
    public $id = 'id';
    public function __construct(private string $c) {}
    public function __toString(): string { return ' class="' . $this->c . '"'; }
    public function addClass(...$a) { return $this; }
  };
  $item = ['title' => 'T', 'url' => '/u', 'below' => [], 'tag' => 'ul', 'label' => 'L', 'text' => 'X',
           'href' => '/h', 'attributes' => ' data-x="1"', 'value' => 'val', 'checked' => $flag, 'items' => [],
           'group' => false];
  return [
    'is_mixed' => $flag, 'highlighted' => $flag, 'modifier' => $v, 'heading' => $v, 'title' => $v,
    'label' => 'Label', 'legend' => 'Legend', 'legend_id' => 'lid',
    'items' => ['A', 'B'], 'more_items' => $flag ? ['C'] : [],
    'links' => $flag ? [$item, ['title' => 'Sub', 'below' => [$item], 'tag' => 'ol']] : [$item],
    'tag' => $flag ? 'ul' : 'simple',
    'pager' => $flag ? ['prev' => $item, 'next' => $item, 'current' => 2] : [],
    'choices' => $flag ? [$item, ['group' => true, 'label' => 'G', 'items' => [$item]]] : null,
    'entries' => [$item], 'multiple' => $flag,
    'notices' => ['status' => ['M']], 'headings' => ['status' => 'Status'],
    'media_type' => 'img', 'media' => '<img src="x">', 'caption' => 'Cap', 'code' => 'c', 'content' => 'Body',
    'program_url' => '/p', 'heading_id' => 'h', 'sidebar' => 'Side', 'body' => 'Body',
    'page' => ['title' => 'T', 'lead' => 'Lead'], 'placeholder' => $v, 'disabled' => $flag, 'tabs' => [$item],
    'tags' => [['visible' => true, 'label' => 'news'], ['visible' => $flag, 'label' => 'events'], ['visible' => false, 'label' => 'x']],
    'total_items' => 3, 'search_terms' => ['twig', 'lint'],
    'attributes' => $attrs('a'), 'wrapper_attributes' => $attrs('w'), 'title_attributes' => $attrs('t'),
  ];
}

function tree(string $html): array {
  libxml_use_internal_errors(true);
  $d = new DOMDocument(); $d->loadHTML('<?xml encoding="utf-8"?><body>' . $html . '</body>');
  $out = [];
  $walk = function (DOMNode $n, bool $pre) use (&$walk, &$out) {
    foreach ($n->childNodes as $c) {
      if ($c instanceof DOMElement) {
        $a = []; foreach ($c->attributes as $at) $a[] = $at->name . '=' . $at->value; sort($a);
        $out[] = '<' . $c->nodeName . ' ' . implode(' ', $a) . '>';
        $walk($c, $pre || in_array($c->nodeName, ['pre', 'textarea']));
        $out[] = '</' . $c->nodeName . '>';
      } elseif ($c instanceof DOMText) {
        $t = $pre ? $c->data : preg_replace('/\s+/', ' ', $c->data);
        if ($pre || trim($t) !== '') $out[] = 'text:' . json_encode($t, JSON_UNESCAPED_UNICODE);
        elseif ($t === ' ') $out[] = 'ws';
      }
    }
  };
  $walk($d->getElementsByTagName('body')->item(0), false);
  // Whitespace between block elements does not matter. Drop "ws" next to blocks.
  $block = '/^<\/?(div|p|ul|ol|li|figure|figcaption|nav|h\d|section|article|select|option|optgroup|label|textarea|pre|body)\b/';
  $res = [];
  foreach ($out as $i => $x) {
    $prevBlock = preg_match($block, $out[$i - 1] ?? '<body');
    $nextBlock = preg_match($block, $out[$i + 1] ?? '</body');
    if ($x === 'ws' && ($prevBlock || $nextBlock)) continue;
    // Whitespace at the start or end of text next to a block element is not visible (except in pre/textarea).
    if (str_starts_with($x, 'text:') && !preg_match('/^<(pre|textarea)\b/', $out[$i - 1] ?? '')) {
      $t = json_decode(substr($x, 5));
      if ($prevBlock) $t = ltrim($t, ' ');
      if ($nextBlock) $t = rtrim($t, ' ');
      $x = 'text:' . json_encode($t, JSON_UNESCAPED_UNICODE);
    }
    $res[] = $x;
  }
  return $res;
}

$fail = 0;
foreach (array_slice($argv, 1) as $dir) {
  $dir = rtrim($dir, '/');
  if (!file_exists("$dir/expected.twig")) { echo "-    $dir (no expected.twig)\n"; continue; }
  $msgs = [];
  foreach ([true, false] as $flag) {
    $l = new AnyLoader(); $l->t = ['in' => file_get_contents("$dir/input.twig"), 'ex' => file_get_contents("$dir/expected.twig")];
    try {
      $ra = env($l)->render('in', context($flag)); $rb = env($l)->render('ex', context($flag));
      // The HTML parser accepts glued attributes (class="a"style="b"), so they are counted separately.
      $glued = fn($h) => preg_match_all('/="[^"]*"[a-zA-Z]/', $h);
      if ($glued($rb) > $glued($ra)) $msgs[] = 'glued attributes (flag=' . ($flag ? 'true' : 'false') . ')';
      $a = tree($ra);
      $b = tree($rb);
    } catch (\Throwable $e) { $msgs[] = 'render error: ' . $e->getMessage(); continue; }
    if ($a !== $b) {
      $diff = array_diff_assoc($a, $b) + array_diff_assoc($b, $a);
      $k = array_key_first($diff);
      $msgs[] = 'differs (flag=' . ($flag ? 'true' : 'false') . ") at node $k: input=" . ($a[$k] ?? '∅') . ' expected=' . ($b[$k] ?? '∅');
    }
  }
  if ($msgs) { $fail++; echo "FAIL $dir\n     " . implode("\n     ", $msgs) . "\n"; } else echo "OK   $dir\n";
}
exit($fail ? 1 : 0);
