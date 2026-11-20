<?php
// Parse-check Twig files with Drupal functions/filters stubbed.
// Usage: TWIG_AUTOLOAD=<project>/vendor/autoload.php php test/parse-check.php <files...>
require getenv('TWIG_AUTOLOAD') ?: exit("Set TWIG_AUTOLOAD to a vendor/autoload.php that includes twig/twig\n");
$t = new \Twig\Environment(new \Twig\Loader\ArrayLoader([]));
$t->registerUndefinedFunctionCallback(fn($n) => new \Twig\TwigFunction($n, fn() => null));
$t->registerUndefinedFilterCallback(fn($n) => new \Twig\TwigFilter($n, fn($x) => $x));
$t->registerUndefinedTokenParserCallback(fn($n) => null);
$t->addTokenParser(new class extends \Twig\TokenParser\AbstractTokenParser {
  public function parse(\Twig\Token $tok): \Twig\Node\Node { $s=$this->parser->getStream(); $s->expect(\Twig\Token::BLOCK_END_TYPE);
    $this->parser->subparse(fn($t)=>$t->test('endtrans'), true); $s->expect(\Twig\Token::BLOCK_END_TYPE); return new \Twig\Node\Nodes([]); }
  public function getTag(): string { return 'trans'; } });
$bad = 0;
foreach (array_slice($argv,1) as $f) {
  try { $t->parse($t->tokenize(new \Twig\Source(file_get_contents($f), $f))); echo "OK   $f\n"; }
  catch (\Throwable $e) { $bad++; echo "FAIL $f: ".$e->getMessage()."\n"; }
}
exit($bad ? 1 : 0);
