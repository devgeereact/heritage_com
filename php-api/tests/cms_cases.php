<?php
/**
 * HeritOS: Phase 4 website CMS helper tests (_cms.php). Required by run.php,
 * which provides check() and has loaded _lib.php (for sanitize_html).
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../_cms.php';

/* ---- slugs -------------------------------------------------------------------- */
check('slug: words to hyphens', slug_clean('  Bespoke Agbada & Cap! '), 'bespoke-agbada-cap');
check('slug: accents transliterated or dropped', (bool)preg_match('/^[a-z0-9-]+$/', slug_clean('Café Kaftán')), true);
check('slug: only punctuation gives empty', slug_clean('!!!'), '');
check('slug: capped at 80 without a trailing hyphen', [strlen(slug_clean(str_repeat('ab-', 40))) <= 80, str_ends_with(slug_clean(str_repeat('ab-', 40)), '-')], [true, false]);
check('slug_ok: clean slug', slug_ok('wedding-suits-2'), true);
check('slug_ok: refuses upper case, double hyphen, path', [slug_ok('Suits'), slug_ok('a--b'), slug_ok('a/b'), slug_ok('')], [false, false, false, false]);

/* ---- social links ------------------------------------------------------------- */
check('social: instagram profile', social_url_ok('instagram', 'https://www.instagram.com/heritclothing'), true);
check('social: linkedin company page', social_url_ok('linkedin', 'https://www.linkedin.com/company/herit'), true);
check('social: x and twitter hosts', [social_url_ok('x', 'https://x.com/herit'), social_url_ok('x', 'https://twitter.com/herit')], [true, true]);
check('social: http refused', social_url_ok('instagram', 'http://instagram.com/herit'), false);
check('social: javascript: refused', social_url_ok('instagram', 'javascript:alert(1)//instagram.com/x'), false);
check('social: data: refused', social_url_ok('facebook', 'data:text/html,<b>x</b>'), false);
check('social: look-alike host refused', social_url_ok('instagram', 'https://instagram.com.evil.io/herit'), false);
check('social: suffix trick refused', social_url_ok('instagram', 'https://evilinstagram.com/herit'), false);
check('social: credentials or port refused', [social_url_ok('instagram', 'https://a:b@instagram.com/x'), social_url_ok('instagram', 'https://instagram.com:8443/x')], [false, false]);
check('social: home page alone refused', social_url_ok('instagram', 'https://instagram.com/'), false);
check('social: wrong platform host refused', social_url_ok('tiktok', 'https://instagram.com/herit'), false);
check('social: unknown platform refused', social_url_ok('myspace', 'https://myspace.com/herit'), false);
check('wa.me: valid link', wa_url_ok('https://wa.me/2348012345678'), true);
check('wa.me: bare country code, http, plus sign or other host refused',
  [wa_url_ok('https://wa.me/234'), wa_url_ok('http://wa.me/2348012345678'), wa_url_ok('https://wa.me/+2348012345678'), wa_url_ok('https://wa.me.evil.io/2348012345678')],
  [false, false, false, false]);
check('wa number: local Nigerian form normalised', wa_number_clean('0801 234 5678'), '2348012345678');
check('wa number: empty stays empty, junk is invalid', [wa_number_clean(''), wa_number_clean('12')], ['', null]);
check('socials_public: invalid, empty and fallback links left out; twitter read as x',
  socials_public(['instagram' => 'https://instagram.com', 'facebook' => '', 'twitter' => 'https://x.com/herit',
    'whatsapp' => 'https://wa.me/234', 'linkedin' => 'https://www.linkedin.com/company/herit']),
  [['platform' => 'x', 'url' => 'https://x.com/herit'], ['platform' => 'linkedin', 'url' => 'https://www.linkedin.com/company/herit']]);

/* ---- business profile ---------------------------------------------------------- */
[$pc, $pe] = profile_clean(['business_name' => ' Herit ', 'business_whatsapp' => '0801 234 5678', 'business_email' => '',
  'socials' => ['instagram' => 'https://instagram.com/herit', 'twitter' => '', 'whatsapp' => '08012345678'], 'unknown_key' => 'x']);
check('profile: cleaned values, unknown keys ignored', [$pe, $pc['business_name'], $pc['business_whatsapp'], $pc['business_email'], isset($pc['unknown_key'])],
  [[], 'Herit', '2348012345678', '', false]);
check('profile: whatsapp number in socials becomes a wa.me link', $pc['socials'], ['instagram' => 'https://instagram.com/herit', 'whatsapp' => 'https://wa.me/2348012345678']);
[, $pe] = profile_clean(['socials' => ['instagram' => 'http://instagram.com/herit', 'facebook' => 'https://facebook.com.evil.io/x', 'myspace' => 'https://myspace.com/x']]);
check('profile: bad social links refused per platform', array_keys($pe), ['socials.instagram', 'socials.facebook', 'socials.myspace']);
[, $pe] = profile_clean(['business_email' => 'not-an-email', 'business_phone' => 'call me', 'business_name' => '[owner: name]']);
check('profile: email, phone and placeholder refused', array_keys($pe), ['business_email', 'business_phone', 'business_name']);
$bp = business_public(['business_name' => 'Herit', 'business_phone' => '', 'business_address' => '1 Road', 'business_address_public' => '0', 'business_whatsapp' => '2348012345678']);
check('business_public: empty omitted, private address hidden, wa.me built', $bp, ['name' => 'Herit', 'whatsapp' => '2348012345678', 'whatsapp_url' => 'https://wa.me/2348012345678']);
check('business_public: address shown only when public', business_public(['business_address' => '1 Road', 'business_address_public' => '1'])['address'] ?? null, '1 Road');

/* ---- JSON-LD ------------------------------------------------------------------- */
check('jsonld: none without a business name', jsonld_local_business(['phone' => '1'], [], 'https://x.test'), null);
$ld = jsonld_local_business(['name' => 'Herit', 'email' => 'a@example.test'], [['platform' => 'x', 'url' => 'https://x.com/herit']], 'https://x.test/');
check('jsonld: only set facts, sameAs from socials', array_keys($ld), ['@context', '@type', '@id', 'name', 'url', 'email', 'sameAs']);
check('jsonld: never a rating', str_contains(json_encode($ld), 'aggregateRating'), false);

/* ---- content validation --------------------------------------------------------- */
[$c, $e] = cms_clean('service', ['title' => 'Suits', 'body' => '<p onclick="x()">Hi<script>alert(1)</script> <a href="javascript:alert(1)">l</a></p>', 'evil' => 1, 'includes' => ['A', '', 'B']]);
check('clean: script, handlers and javascript: links stripped', [str_contains($c['body'], 'script'), str_contains($c['body'], 'onclick'), str_contains($c['body'], 'javascript')], [false, false, false]);
check('clean: unknown fields dropped, empty list items removed', [isset($c['evil']), $c['includes']], [false, ['A', 'B']]);
check('clean: over-long title refused', isset(cms_clean('service', ['title' => str_repeat('x', 121)])[1]['title']), true);
check('clean: bad date refused', isset(cms_clean('policy', ['effective_date' => '2026-02-30'])[1]['effective_date']), true);
check('clean: images deduplicated, role defaulted', cms_clean('project', ['images' => [['media_id' => 3, 'alt' => 'a', 'role' => 'odd'], ['media_id' => 3]]])[0]['images'],
  [['media_id' => 3, 'alt' => 'a', 'role' => 'other']]);
check('media refs: hero, cover and gallery', cms_media_refs(['hero_media_id' => 1, 'cover_media_id' => 2, 'images' => [['media_id' => 2], ['media_id' => 5]]]), [1, 2, 5]);

/* ---- publish rules ---------------------------------------------------------------- */
$media = [7 => ['alt_text' => 'Navy suit, front', 'deleted_at' => null], 8 => ['alt_text' => '', 'deleted_at' => null], 9 => ['alt_text' => 'Gone image', 'deleted_at' => '2026-10-01']];
check('publish: service title required', array_keys(cms_publish_problems('service', [], [])), ['title']);
check('publish: placeholder text blocks', isset(cms_publish_problems('faq', ['question' => 'Q?', 'answer' => '<p>[owner: confirm]</p>'], [])['placeholder']), true);
check('publish: image without alt blocks; alt override passes',
  [isset(cms_publish_problems('service', ['title' => 'T', 'hero_media_id' => 8], $media)['media.8']),
   cms_publish_problems('project', ['title' => 'T', 'images' => [['media_id' => 8, 'alt' => 'Back view of a kaftan']], 'own_work' => true, 'consent_images' => true], $media)],
  [true, []]);
check('publish: deleted image blocks', isset(cms_publish_problems('service', ['title' => 'T', 'hero_media_id' => 9], $media)['media.9']), true);
check('publish: project needs image consent', isset(cms_publish_problems('project', ['title' => 'T', 'cover_media_id' => 7], $media)['consent']), true);
check('publish: client work needs client consent', isset(cms_publish_problems('project', ['title' => 'T', 'cover_media_id' => 7, 'consent_images' => true], $media)['consent']), true);
check('publish: client work with both consents passes', cms_publish_problems('project', ['title' => 'T', 'cover_media_id' => 7, 'consent_images' => true, 'consent_client' => true], $media), []);
check('publish: project needs an image', isset(cms_publish_problems('project', ['title' => 'T', 'own_work' => true, 'consent_images' => true], [])['images']), true);
check('placeholder: markers found, ordinary text passes', [cms_has_placeholder('{{name}}'), cms_has_placeholder('Lorem ipsum'), cms_has_placeholder('Made in Lagos')], [true, true, false]);
check('leak check: phone, email and job code found', cms_private_leak_check('Call 0803 123 4567 or a@b.ng about HC-0042'), ['phone', 'email', 'staff_code']);
check('leak check: clean text', cms_private_leak_check('A navy agbada for a wedding'), []);
check('public text: private consent note not checked', str_contains(cms_public_text('project', ['title' => 'T', 'consent_note' => 'Client 0803 123 4567']), '0803'), false);

/* ---- draft, publish, unpublish, rollback ---------------------------------------- */
$row = ['status' => 'draft', 'live' => null, 'draft' => null, 'prev' => null, 'version' => 0, 'published_at' => null];
check('transition: nothing to publish', cms_transition($row, 'publish')[1], 'nothing_to_publish');
[$r1] = cms_transition(['draft' => ['t' => 'v1']] + $row, 'publish', '2026-10-11 10:00:00');
check('transition: first publish', [$r1['status'], $r1['live'], $r1['draft'], $r1['prev'], $r1['version'], $r1['published_at']],
  ['published', ['t' => 'v1'], null, null, 1, '2026-10-11 10:00:00']);
check('transition: publishing again without a draft is refused', cms_transition($r1, 'publish')[1], 'no_changes');
[$r2] = cms_transition(['draft' => ['t' => 'v2']] + $r1, 'publish', '2026-10-12 10:00:00');
check('transition: second publish keeps one previous version and the first date', [$r2['live'], $r2['prev'], $r2['version'], $r2['published_at']],
  [['t' => 'v2'], ['t' => 'v1'], 2, '2026-10-11 10:00:00']);
[$r3] = cms_transition($r2, 'rollback');
check('transition: rollback restores the previous version', [$r3['live'], $r3['prev'], $r3['version'], $r3['status']], [['t' => 'v1'], ['t' => 'v2'], 3, 'published']);
[$r4] = cms_transition($r3, 'rollback');
check('transition: a second rollback undoes the first', $r4['live'], ['t' => 'v2']);
check('transition: rollback needs a previous version', cms_transition($r1, 'rollback')[1], 'no_previous_version');
[$u] = cms_transition($r2, 'unpublish');
check('transition: unpublish keeps the content', [$u['status'], $u['live']], ['unpublished', ['t' => 'v2']]);
check('transition: unpublish twice refused', cms_transition($u, 'unpublish')[1], 'not_published');
[$rp] = cms_transition($u, 'publish');
check('transition: republish after unpublish keeps the version', [$rp['status'], $rp['version']], ['published', 2]);
check('transition: published items cannot be deleted, drafts can', [cms_transition($u, 'delete')[1], cms_transition($row, 'delete')[1]], ['published_once', null]);
check('transition: discard needs a draft', [cms_transition($r1, 'discard_draft')[1], cms_transition(['draft' => ['x' => 1]] + $r1, 'discard_draft')[0]['draft']], ['no_draft', null]);

/* ---- public projections --------------------------------------------------------- */
$mrow = ['width' => 1600, 'height' => 1200, 'alt_text' => 'Navy suit, front', 'caption' => '',
  'variants' => ['webp' => ['1600' => 'b-w1600.webp', '800' => 'b-w800.webp'], 'jpg' => ['1600' => 'b-w1600.jpg']]];
$proj = cms_public('project', ['id' => 4, 'slug' => 'navy-suit', 'published_at' => '2026-10-11 10:00:00'],
  ['title' => 'Navy suit', 'cover_media_id' => 7, 'images' => [['media_id' => 7, 'alt' => '', 'role' => 'front']],
   'own_work' => false, 'consent_images' => true, 'consent_client' => true, 'consent_note' => 'Signed 0803 123 4567', 'client_id' => 42],
  [7 => $mrow], '/uploads/site');
check('project projection: exact key set', array_keys($proj), ['slug', 'title', 'summary', 'body', 'garment', 'fabric', 'service_slug', 'cover', 'images', 'featured', 'seo_title', 'seo_description', 'published_at', 'updated_at']);
$pj = json_encode($proj);
check('project projection: no consent, client or staff fields', [str_contains($pj, 'consent'), str_contains($pj, 'client_id'), str_contains($pj, '42'), str_contains($pj, '0803'), str_contains($pj, 'draft')], [false, false, false, false, false]);
check('media projection: srcset sorted by width, jpg fallback, alt from the image',
  [array_column($proj['cover']['srcset'], 'width'), $proj['cover']['url'], $proj['cover']['alt']], [[800, 1600], '/uploads/site/b-w1600.jpg', 'Navy suit, front']);
check('service projection: exact key set', array_keys(cms_public('service', ['slug' => 's', 'published_at' => null], ['title' => 'S', 'internal' => 'x'], [], '/u')),
  ['slug', 'title', 'summary', 'body', 'includes', 'price_note', 'hero', 'seo_title', 'seo_description', 'published_at', 'updated_at']);
check('faq projection: exact key set', array_keys(cms_public('faq', ['id' => 1, 'slug' => 'faq-x'], ['question' => 'Q', 'answer' => 'A'], [], '/u')), ['id', 'question', 'answer', 'category', 'show_on_home']);
check('page projection: missing image gives null', cms_public('page', ['slug' => 'about'], ['headline' => 'H', 'hero_media_id' => 99], [], '/u')['hero'], null);

/* ---- sitemap and uploads ------------------------------------------------------------ */
$xml = sitemap_xml([['loc' => 'https://x.test/'], ['loc' => 'https://x.test/work/a?x=1&y=2', 'lastmod' => '2026-10-11 23:30:00']]);
$sx = @simplexml_load_string($xml);
check('sitemap: valid XML with two URLs', $sx !== false && count($sx->url) === 2, true);
check('sitemap: & escaped, lastmod as a date', [str_contains($xml, '&amp;y=2'), (string)$sx->url[1]->lastmod], [true, '2026-10-11']);
check('upload mime: allowed types only', [upload_mime_ok('image/jpeg'), upload_mime_ok('image/webp'), upload_mime_ok('image/gif'), upload_mime_ok('text/x-php')], ['jpg', 'webp', null, null]);
check('variant plan: large, mid, exact and small images', [image_variant_plan(3000), image_variant_plan(2400), image_variant_plan(1200), image_variant_plan(800), image_variant_plan(500)],
  [[800, 1600, 2400], [800, 1600, 2400], [800, 1200], [800], [500]]);
require_once __DIR__ . '/../_media.php';
$mm = fn($w, $widths) => ['width' => $w, 'variants' => json_encode(['webp' => array_fill_keys(array_map('strval', $widths), 'x.webp')])];
check('media refresh: a wide image made before 2400px is made again; current and small ones are not',
  [media_needs_refresh($mm(2400, [800, 1600])), media_needs_refresh($mm(2400, [800, 1600, 2400])), media_needs_refresh($mm(1200, [800, 1200])), media_needs_refresh(['width' => 2400, 'variants' => '{}'])],
  [true, false, false, false]);

// ---- Home hero slides (schema_phase28.sql, D-023)
check('slide: entity known', in_array('slide', CMS_ENTITIES, true), true);
check('slide: internal paths accepted', [cms_path_ok('/services'), cms_path_ok('/contact?type=company'), cms_path_ok('/work/navy-suit')], [true, true, true]);
check('slide: unsafe paths refused', [cms_path_ok('https://evil.test'), cms_path_ok('//evil.test'), cms_path_ok('javascript:alert(1)'), cms_path_ok('/a/../b'), cms_path_ok('services')], [false, false, false, false, false]);
check('slide: clean refuses an outside link', isset(cms_clean('slide', ['cta_path' => 'https://evil.test'])[1]['cta_path']), true);
check('slide: clean keeps the fields', cms_clean('slide', ['headline' => ' Cut for you ', 'cta_path' => '/services', 'evil' => 1])[0], ['headline' => 'Cut for you', 'cta_path' => '/services']);
check('slide: needs a headline and a photograph to publish', array_keys(array_intersect_key(cms_publish_problems('slide', [], []), ['headline' => 1, 'hero_media_id' => 1])), ['headline', 'hero_media_id']);
check('slide: photograph without alt text refused', isset(cms_publish_problems('slide', ['headline' => 'Hi', 'hero_media_id' => 9], [9 => ['alt_text' => '', 'deleted_at' => null]])['media.9']), true);
$sp = cms_public('slide', ['id' => 4, 'slug' => 'slide-x'], ['headline' => 'Cut for you', 'cta_path' => '//evil', 'secret' => 'x'], [], '/u');
check('slide: public projection is a whitelist', [array_keys($sp), $sp['cta_path']], [['id', 'label', 'eyebrow', 'headline', 'lead', 'hero', 'cta_label', 'cta_path'], '']);

/* ---- link previews (spa.php, K-06) ------------------------------------------- */
check('spa route: home, pages, service, project', [spa_route('/'), spa_route('/about/'), spa_route('/company-orders'), spa_route('/services/wedding-suits'), spa_route('/work/navy-agbada?x=1')],
  [['page', 'home'], ['page', 'about'], ['page', 'company'], ['service', 'wedding-suits'], ['project', 'navy-agbada']]);
check('spa route: staff, unknown and odd paths give null', [spa_route('/today'), spa_route('/services/a/b'), spa_route('/services/UPPER'), spa_route('/journal/x')], [null, null, null, null]);
check('spa cut: short text unchanged', spa_cut('  Made  to measure. '), 'Made to measure.');
check('spa cut: long text cut at a word with an ellipsis', [cms_len(spa_cut(str_repeat('word ', 60))) <= 156, str_ends_with(spa_cut(str_repeat('word ', 60)), 'word…')], [true, true]);
check('spa cut: tags stripped', spa_cut('<b>Bold</b> claim'), 'Bold claim');
$sm = spa_meta('service', 'suits', ['title' => 'Suits', 'summary' => 'Two fittings.', 'hero' => ['url' => '/uploads/site/a.jpg']], '/services/suits', 'https://heritclothing.com/');
check('spa meta: service title, summary, absolute image and URL', [$sm['title'], $sm['description'], $sm['image'], $sm['url'], $sm['type']],
  ['Suits | Herit Clothing', 'Two fittings.', 'https://heritclothing.com/uploads/site/a.jpg', 'https://heritclothing.com/services/suits', 'website']);
$sm = spa_meta('service', 'suits', ['title' => 'Suits', 'seo_title' => 'Suits in Lagos', 'seo_description' => 'SEO text', 'summary' => 'Other'], '/services/suits', 'https://heritclothing.com');
check('spa meta: SEO fields win', [$sm['title'], $sm['description'], $sm['image']], ['Suits in Lagos | Herit Clothing', 'SEO text', '']);
$sm = spa_meta('page', 'home', null, '/', 'https://heritclothing.com');
check('spa meta: home and missing content use the defaults', [$sm['title'], $sm['description'], $sm['url']], [SPA_HOME_TITLE, SPA_DEFAULT_DESCRIPTION, 'https://heritclothing.com/']);
check('spa meta: unpublished item gets no canonical URL', spa_meta('service', 'gone', null, '/services/gone', 'https://h.com')['url'], '');
check('spa meta: http or javascript images dropped', [spa_meta('project', 'x', ['cover' => ['url' => 'http://x/a.jpg']], '/work/x', 'https://h.com')['image'], spa_meta('project', 'x', ['cover' => ['url' => 'javascript:alert(1)']], '/work/x', 'https://h.com')['image']], ['', '']);
$hh = spa_head_html(['title' => 'A "quoted" <b>', 'description' => "It's & more", 'url' => 'https://h.com/a', 'image' => '', 'type' => 'website']);
check('spa head: escaped, no image means summary card', [str_contains($hh, 'A &quot;quoted&quot; &lt;b&gt;'), str_contains($hh, 'It&#039;s &amp; more'), str_contains($hh, '<b>'), str_contains($hh, 'content="summary"'), str_contains($hh, 'og:image')], [true, true, false, true, false]);
$hf = spa_head_html(spa_meta('page', 'home', null, '/', 'https://heritclothing.com'));
check('spa head: no photograph falls back to the brand icon, summary card, en_NG locale', [str_contains($hf, 'og:image" content="https://heritclothing.com/icon-512.png"'), str_contains($hf, 'content="summary"'), str_contains($hf, 'og:locale" content="en_NG"')], [true, true, true]);
$page = "<head>\n  <!--hc:head-->\n  <title>Old</title>\n  <!--/hc:head-->\n</head>";
check('spa inject: replaces only the marked block', [str_contains(spa_inject($page, '<title>New $1 \\0</title>'), '<title>New $1 \\0</title>'), str_contains(spa_inject($page, '<title>New</title>'), 'Old')], [true, false]);
check('spa inject: page without markers unchanged', spa_inject('<head><title>X</title></head>', '<title>Y</title>'), '<head><title>X</title></head>');
check('journal print: tile classes and fabric names map to a print', [journal_print_name('hc-tile-adire'), journal_print_name('Ankara'), journal_print_name('hc-tile-asooke'), journal_print_name('Aso-Oke'), journal_print_name('hc-tile-mixed'), journal_print_name('')], ['adire', 'ankara', 'asooke', 'asooke', 'kente', 'kente']);
check('page keys: the fabric story band is a page with no public path of its own', [in_array('fabrics', CMS_PAGE_KEYS, true), isset(CMS_PAGE_PATHS['fabrics']), spa_route('/fabrics')], [true, false, null]);
