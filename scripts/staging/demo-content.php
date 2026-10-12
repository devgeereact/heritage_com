<?php
/**
 * Demo website content for LOCAL STAGING ONLY (D-024). Loaded by
 * `php scripts/staging/seed.php --demo` (npm run staging:demo).
 *
 * It replaces the plain "Staging ..." website records with realistic,
 * professional demo content so developers can see how every public section
 * looks once the owner has published real material: four services, six
 * projects, six questions, both policies, all six fixed pages, three demo
 * reviews and three journal posts.
 *
 * Safety:
 * - Runs only through seed.php, which refuses anything but heritos_staging.
 * - Every image is a generated illustration (cloth tone, a drawn garment
 *   outline and the words DEMO IMAGE), never a photograph.
 * - Contact details stay on example.test and 0800 numbers; reviews are labelled
 *   "Demo review"; policies, biography and posts say they are demo text.
 * - Production never runs this file. Production content comes only from the
 *   owner through the Website area.
 *
 * Re-running is safe: it clears the website records and the demo rows first.
 * `npm run staging:setup` returns staging to the plain records the end-to-end
 * scripts expect.
 */

/** Generated demo illustration (JPEG path). Kinds: jacket, waistcoat, agbada, kaftan, shirt, tape. */
function demo_draw($w, $h, array $bg, $kind) {
  $im = imagecreatetruecolor($w, $h);
  imageantialias($im, true);
  [$r, $g, $b] = $bg;
  $tone = fn($d) => imagecolorallocate($im, max(0, min(255, $r + $d)), max(0, min(255, $g + $d)), max(0, min(255, $b + $d)));
  imagefill($im, 0, 0, $tone(0));
  // fine weave, then a soft lighter field behind the garment
  for ($y = 0; $y < $h; $y += 6) imageline($im, 0, $y, $w, $y, $tone(-5));
  for ($x = 0; $x < $w; $x += 9) imageline($im, $x, 0, $x, $h, $tone(4));
  imagefilledellipse($im, intdiv($w, 2), (int)($h * 0.5), (int)($w * 0.92), (int)($h * 0.86), $tone(9));

  // Drawing space: x from -500 to 500 around the centre, y from 0 to 1000 down from 14% of the height.
  $s = min($w / 1000, ($h * 0.78) / 1000);
  $X = fn($x) => (int)round($w / 2 + $x * $s);
  $Y = fn($y) => (int)round($h * 0.14 + $y * $s);
  $poly = function (array $pts, $col) use ($im, $X, $Y) {
    $out = [];
    for ($i = 0; $i < count($pts); $i += 2) { $out[] = $X($pts[$i]); $out[] = $Y($pts[$i + 1]); }
    imagefilledpolygon($im, $out, $col);
  };
  $dot = fn($x, $y, $d, $col) => imagefilledellipse($im, $X($x), $Y($y), (int)($d * $s), (int)($d * $s), $col);
  $line = fn($x1, $y1, $x2, $y2, $col) => imageline($im, $X($x1), $Y($y1), $X($x2), $Y($y2), $col);

  $body = $tone(-38); $deep = $tone(-60); $mark = $tone(-75); $cloth = imagecolorallocate($im, 238, 234, 226);
  imagesetthickness($im, max(2, (int)(4 * $s)));
  switch ($kind) {
    case 'jacket':
      $poly([-90,0, -330,70, -360,820, -300,830, -280,300, -260,1000, 260,1000, 280,300, 300,830, 360,820, 330,70, 90,0], $body);
      // fall through to the shared front
    case 'waistcoat':
      if ($kind === 'waistcoat') $poly([-100,20, -250,90, -250,960, 250,960, 250,90, 100,20], $body);
      $poly([-90,0, 0,420, 90,0], $cloth);
      $poly([-14,40, 0,340, 14,40], $mark);
      $poly([-90,0, -200,260, -40,560, 0,420], $deep);
      $poly([90,0, 200,260, 40,560, 0,420], $deep);
      $dot(0, 620, 22, $mark); $dot(0, 720, 22, $mark);
      $line(-210, 700, -100, 700, $mark); $line(100, 700, 210, 700, $mark);
      break;
    case 'agbada':
    case 'kaftan':
      $wide = $kind === 'agbada' ? 470 : 300;
      $poly([-70,0, -$wide,160, -$wide,700, -260,760, -230,1000, 230,1000, 260,760, $wide,700, $wide,160, 70,0], $body);
      $poly([-70,0, 0,120, 70,0], $cloth);
      $line(0, 120, 0, 540, $deep);
      for ($i = 0; $i < 5; $i++) imagearc($im, $X(0), $Y(190 + $i * 42), (int)((280 - $i * 36) * $s), (int)(60 * $s), 0, 180, $deep);
      break;
    case 'shirt':
      $poly([-90,0, -300,80, -330,560, -260,570, -250,260, -250,1000, 250,1000, 250,260, 260,570, 330,560, 300,80, 90,0], $cloth);
      $poly([-90,0, -40,110, 0,40, 40,110, 90,0], $tone(-20));
      $line(0, 40, 0, 1000, $tone(-30));
      foreach ([180, 320, 460, 600, 740] as $by) $dot(18, $by, 14, $tone(-40));
      break;
    default: // tape measure in loose coils
      $tape = imagecolorallocate($im, 214, 160, 60);
      imagesetthickness($im, max(3, (int)(26 * $s)));
      for ($i = 0; $i < 3; $i++) imagearc($im, $X(0), $Y(480), (int)((720 - $i * 170) * $s), (int)((540 - $i * 130) * $s), 200, 520, $tape);
  }
  imagesetthickness($im, 1);

  // DEMO IMAGE label, bottom left
  $pad = (int)max(24, $w * 0.03);
  imagefilledrectangle($im, $pad - 10, $h - $pad - 28, $pad + 100, $h - $pad + 6, $tone(-95));
  imagestring($im, 3, $pad, $h - $pad - 20, 'DEMO IMAGE', imagecolorallocate($im, 255, 255, 255));

  $tmp = tempnam(sys_get_temp_dir(), 'hc-demo');
  imagejpeg($im, $tmp, 86);
  return $tmp;
}

function seed_demo() {
  require_once __DIR__ . '/../../php-api/_jobs.php';
  require_once __DIR__ . '/../../php-api/_cms.php';
  require_once __DIR__ . '/../../php-api/_media.php';
  if (!has_table('cms_items')) { echo "  Demo: cms_items missing (schema_phase26.sql not imported); skipped.\n"; return; }
  $row = q("SELECT id FROM users WHERE email = 'staging-admin@example.test'")->get_result()->fetch_row();
  if (!$row) { fwrite(STDERR, "Demo: run npm run staging:setup first.\n"); exit(1); }
  $admin = (int)$row[0];

  /* ---------------------------------------------------------- business profile */
  [$profile, $err] = profile_clean([
    'business_name' => 'Herit Clothing',
    'business_phone' => '0800 000 0099',
    'business_whatsapp' => '08000000099',
    'business_email' => 'studio@example.test',
    'business_address' => 'Demo address, Lekki Phase 1, Lagos',
    'business_address_public' => '0',
    'business_area_text' => 'Lekki, Victoria Island and Ikoyi, Lagos',
    'business_hours_text' => 'Mon to Fri 9am to 6pm, Sat 10am to 2pm',
    'socials' => ['instagram' => 'https://www.instagram.com/staging.example', 'linkedin' => 'https://www.linkedin.com/company/staging-example'],
    'journal_enabled' => '1',
  ]);
  if ($err) { fwrite(STDERR, "Demo profile invalid: " . json_encode($err) . "\n"); exit(1); }
  foreach ($profile as $k => $v) {
    $val = $k === 'socials' ? json_encode($v, JSON_UNESCAPED_SLASHES) : (string)$v;
    q('INSERT INTO settings (skey, svalue) VALUES (?,?) ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)', 'ss', $k, $val);
  }

  $GLOBALS['conn']->query('DELETE FROM cms_items');

  $image = function ($w, $h, array $tone, $kind, $alt) use ($admin) {
    $tmp = demo_draw($w, $h, $tone, $kind);
    [$id] = media_ingest($tmp, $admin, $alt, 'Generated demo illustration, not a photograph');
    @unlink($tmp);
    return $id;
  };
  $item = function ($entity, $slug, array $data, $sort) use ($admin) {
    [$clean, $err] = cms_clean($entity, $data);
    $problems = $err ?: cms_publish_problems($entity, $clean, media_rows(cms_media_refs($clean)));
    if ($problems) { fwrite(STDERR, "Demo $entity/$slug not publishable: " . json_encode($problems) . "\n"); exit(1); }
    $j = json_encode($clean, JSON_UNESCAPED_UNICODE);
    q("INSERT INTO cms_items (entity, slug, status, sort, live, version, published_at, live_updated_at, created_by)
       VALUES (?, ?, 'published', ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP(), ?)", 'ssisi', $entity, $slug, $sort, $j, $admin);
  };

  $navy = [38, 50, 74]; $charcoal = [58, 60, 64]; $ivory = [214, 204, 186]; $olive = [92, 98, 70];
  $camel = [168, 132, 92]; $wine = [96, 44, 52]; $stone = [196, 190, 180];

  /* ---------------------------------------------------------- services */
  $services = [
    ['bespoke-suits', 'Bespoke suits', 'Two- and three-piece suits cut from a pattern drafted for you, with two fittings before the final press.',
      '<p>Every suit starts with a conversation about where it will be worn. I take a full set of measurements, draft a pattern for you and cut the cloth only once the details are agreed.</p><p>You come back for a baste fitting and a final fitting, so the shoulders, waist and trouser break are set on you, not on a size chart.</p>',
      ['Consultation and fabric guidance', 'Full measurements and a personal pattern', 'Two fittings', 'Final press and garment bag'], 'Priced per garment once the fabric and details are agreed.', 'jacket', $navy],
    ['agbada-and-kaftan', 'Agbada and kaftan', 'Ceremonial and everyday native wear, tailored so it sits cleanly and moves well.',
      '<p>Agbada sets, kaftans and senators for weddings, Fridays and family occasions. Embroidery, cap and fabric are chosen with you and recorded on your order.</p>',
      ['Fabric and embroidery guidance', 'Agbada, buba and sokoto, or kaftan', 'One fitting', 'Matching cap on request'], 'Priced per set; embroidery quoted separately.', 'agbada', $ivory],
    ['made-to-measure-shirts', 'Made-to-measure shirts', 'Shirts cut to your neck, sleeve and posture, with the collar and cuff you prefer.',
      '<p>After the first shirt is approved, your pattern is kept on file so repeat orders need no new appointment.</p>',
      ['Collar and cuff choice', 'Pattern kept on file', 'Repeat orders without a fitting'], 'Priced per shirt.', 'shirt', $stone],
    ['alterations', 'Alterations and restyling', 'Adjustments to garments you already own, from a taken-in waist to a re-cut jacket.',
      '<p>Bring the garment to your appointment. I check what can be changed and confirm the price before any work begins.</p>',
      ['Assessment at your appointment', 'Written price before work starts'], 'Priced after the garment is assessed.', 'tape', $camel],
  ];
  foreach ($services as $i => [$slug, $title, $sum, $body, $inc, $note, $kind, $tone]) {
    $mid = $image(1500, 1000, $tone, $kind, "Demo illustration: $title");
    $item('service', $slug, ['title' => $title, 'summary' => $sum, 'body' => $body, 'includes' => $inc, 'price_note' => $note,
      'hero_media_id' => $mid, 'seo_description' => $sum], ($i + 1) * 10);
  }

  /* ---------------------------------------------------------- projects */
  $projects = [
    ['navy-wedding-two-piece', 'Navy two-piece for a wedding', 'Two-piece suit', 'Navy wool, 260g', 'bespoke-suits', 'jacket', $navy, true,
      'A groom wanted a suit he would wear again after the day. We chose a mid-weight navy that holds its shape in Lagos heat.'],
    ['ivory-agbada-set', 'Ivory agbada set', 'Agbada, buba and sokoto', 'Ivory brocade', 'agbada-and-kaftan', 'agbada', $ivory, true,
      'A full ceremonial set with tonal embroidery at the neck, cut wide enough to move freely through a long day.'],
    ['charcoal-three-piece', 'Charcoal three-piece', 'Three-piece suit', 'Charcoal flannel', 'bespoke-suits', 'jacket', $charcoal, true,
      'A boardroom suit with a waistcoat that can be worn on its own. Two fittings settled the shoulder line.'],
    ['olive-kaftan', 'Olive kaftan for Fridays', 'Kaftan and trousers', 'Olive linen blend', 'agbada-and-kaftan', 'kaftan', $olive, false,
      'A lighter kaftan for regular wear, with a hidden placket and side pockets.'],
    ['white-poplin-shirts', 'White poplin shirts', 'Three shirts', 'White cotton poplin', 'made-to-measure-shirts', 'shirt', $stone, false,
      'A first order of three shirts; the pattern is now on file for repeat orders.'],
    ['front-desk-waistcoats', 'Front-desk waistcoats', 'Waistcoats for a team', 'Wine wool blend', 'bespoke-suits', 'waistcoat', $wine, false,
      'A coordinated set for a hotel front desk: one sample approved first, then each wearer measured.'],
  ];
  foreach ($projects as $n => [$slug, $title, $garment, $fabric, $svc, $kind, $tone, $featured, $summary]) {
    $cover = $image(1200, 1500, $tone, $kind, "Demo illustration: $title");
    $detail = $image(1200, 1500, array_map(fn($c) => max(0, $c - 14), $tone), $kind, "Demo illustration, second view: $title");
    $item('project', $slug, ['title' => $title, 'summary' => $summary, 'body' => "<p>$summary</p>",
      'garment' => $garment, 'fabric' => $fabric, 'service_slug' => $svc, 'cover_media_id' => $cover,
      'images' => [['media_id' => $cover, 'alt' => "Demo illustration: $title", 'role' => 'front'],
                   ['media_id' => $detail, 'alt' => "Demo illustration, second view: $title", 'role' => 'detail']],
      'featured' => $featured, 'own_work' => true, 'consent_images' => true, 'consent_client' => false,
      'consent_note' => 'Demo: generated illustration'], ($n + 1) * 10);
  }

  /* ---------------------------------------------------------- questions */
  $faqs = [
    ['How long does a suit take?', '<p>Usually four to six weeks from the first measurement, including two fittings. Tell me your date at the start and I will say honestly whether it can be met.</p>', 'Timing', true],
    ['Can I bring my own fabric?', '<p>Yes. Bring it to your appointment and I will check the length and quality before we agree the work.</p>', 'Fabric', true],
    ['Do I pay a deposit?', '<p>A deposit is agreed on your written quote before any cutting. The balance is paid at collection.</p>', 'Payment', true],
    ['Where are fittings held?', '<p>At the studio, by appointment. Visits can be arranged for larger company orders.</p>', 'Appointments', true],
    ['Can I change details after the quote?', '<p>Yes, until the cloth is cut. Later changes are possible where the garment allows and may change the price.</p>', 'Orders', false],
    ['Do you deliver?', '<p>Collection is from the studio. Delivery within Lagos can be arranged for a fee.</p>', 'Delivery', false],
  ];
  foreach ($faqs as $i => [$qn, $a, $cat, $home]) {
    $item('faq', 'faq-demo-' . ($i + 1), ['question' => $qn, 'answer' => $a, 'category' => $cat, 'show_on_home' => $home], ($i + 1) * 10);
  }

  /* ---------------------------------------------------------- policies */
  $item('policy', 'privacy', ['title' => 'Privacy notice', 'effective_date' => '2026-10-12', 'body' =>
    '<p><strong>Demo text for local staging.</strong> The owner publishes the real notice.</p><h2>What is kept</h2><p>Your name, contact details, measurements and order history, so your garments can be made and tracked.</p><h2>Who sees it</h2><p>Only the studio. Measurements are never published.</p><h2>Your choices</h2><p>Ask for a copy of your record, or for it to be removed, at any time.</p>'], 10);
  $item('policy', 'terms', ['title' => 'Order terms', 'effective_date' => '2026-10-12', 'body' =>
    '<p><strong>Demo text for local staging.</strong> The owner publishes the real terms.</p><h2>Quotes</h2><p>Work starts once the written quote and deposit are agreed.</p><h2>Changes</h2><p>Details can change until the cloth is cut.</p><h2>Collection</h2><p>Garments are held for 30 days after you are told they are ready.</p>'], 20);

  /* ---------------------------------------------------------- pages */
  $heroId = $image(1600, 2000, $navy, 'jacket', 'Demo illustration: a navy suit jacket');
  $aboutId = $image(1600, 2000, $camel, 'tape', "Demo illustration: a tailor's measuring tape");
  $companyId = $image(1600, 1100, $wine, 'waistcoat', 'Demo illustration: a team waistcoat');
  $item('page', 'home', ['headline' => 'Tailored menswear, made for you in Lagos.',
    'intro' => 'Suits, native wear and shirts cut to your measurements. Every order is agreed in writing before the cloth is cut, and you can follow it online until collection.',
    'hero_media_id' => $heroId, 'seo_description' => 'Made-to-measure suits, agbada, kaftans and shirts in Lagos, with fittings by appointment.'], 10);
  $item('page', 'about', ['headline' => 'One tailor, from first measurement to final press.',
    'intro' => 'Herit Clothing is a small studio. The person you speak to is the person who cuts, fits and finishes your garment.',
    'body' => '<p><strong>Demo biography.</strong> The owner replaces this with their own story.</p><p>Herit makes clothing that fits the way men in Lagos live: warm days, long ceremonies and offices that switch between both.</p><p>Every garment is checked against your measurements before it is handed over.</p>',
    'hero_media_id' => $aboutId], 20);
  $item('page', 'how_it_works', ['headline' => 'From first conversation to collection.',
    'intro' => 'Five steps, each agreed with you before the next one starts.',
    'body' => '<h2>1. Discuss</h2><p>Tell me the garment, the occasion and the date.</p><h2>2. Measure</h2><p>We meet for measurements and choose the fabric.</p><h2>3. Agree</h2><p>You approve a written quote and pay the deposit.</p><h2>4. Sew and fit</h2><p>The garment is made and fitted on you.</p><h2>5. Collect</h2><p>Collect it from the studio or arrange delivery.</p>'], 30);
  $item('page', 'company', ['headline' => 'Coordinated menswear for teams and events.',
    'intro' => 'Uniforms, groomsmen and event wear, with one sample approved first, then each wearer measured and fitted.',
    'body' => '<p>Share the garment, the number of pieces and your date. I confirm capacity before quoting.</p>', 'hero_media_id' => $companyId], 40);
  $item('page', 'services_intro', ['headline' => 'What I make',
    'intro' => 'Menswear cut to your measurements, with the price agreed before work begins.'], 50);
  $item('page', 'contact', ['headline' => 'Start your order',
    'intro' => 'Tell me what you would like made and I will reply to arrange a measurement appointment.'], 60);

  /* ---------------------------------------------------------- reviews and journal */
  if (has_table('testimonials')) {
    $GLOBALS['conn']->query("DELETE FROM testimonials WHERE tile = 'hc-tile-demo'");
    foreach ([
      ['T. A.', 'Demo review', 'The fittings made the difference. The jacket sits properly at the shoulder, which no shop suit ever has.'],
      ['K. O.', 'Demo review', 'Clear quote, clear date, and I could check progress whenever I wanted.'],
      ['M. B.', 'Demo review', 'We ordered waistcoats for our front desk. One sample first, then everyone fitted. Easy to manage.'],
    ] as $i => [$name, $loc, $quote]) {
      q("INSERT INTO testimonials (name, location, quote, rating, tile, featured, status, sort) VALUES (?, ?, ?, 5, 'hc-tile-demo', 1, 'published', ?)",
        'sssi', $name, $loc, $quote, ($i + 1) * 10);
    }
  }
  if (has_table('blog_posts')) {
    $GLOBALS['conn']->query("DELETE FROM blog_posts WHERE slug LIKE 'demo-%'");
    // The plain staging test posts would sit beside the demo posts; keep them as drafts.
    $GLOBALS['conn']->query("UPDATE blog_posts SET status = 'draft' WHERE slug LIKE 'test-post-%'");
    foreach ([
      ['demo-choosing-suit-fabric', 'Choosing a suit fabric for Lagos weather', 'Weight, weave and colour: what keeps a suit comfortable from the office to the evening.', 'Fabric', 2],
      ['demo-what-happens-at-a-fitting', 'What happens at a fitting', 'Why there are two fittings, and what is checked at each one.', 'Process', 9],
      ['demo-caring-for-agbada', 'Caring for agbada and embroidery', 'How to store and press a ceremonial set so it lasts for years.', 'Care', 16],
    ] as [$slug, $title, $excerpt, $cat, $daysAgo]) {
      q("INSERT INTO blog_posts (slug, title, excerpt, body, category, status, author, published_at)
         VALUES (?, ?, ?, ?, ?, 'published', 'Herit Clothing (demo)', DATE_SUB(NOW(), INTERVAL ? DAY))",
        'sssssi', $slug, $title, $excerpt, "<p>$excerpt</p><p><strong>Demo post.</strong> The owner writes the real journal.</p>", $cat, $daysAgo);
    }
  }

  echo "  Demo website: profile, 4 services, 6 projects, 6 questions, 2 policies, 6 pages, 3 demo reviews, 3 journal posts (generated DEMO illustrations)\n";
}
