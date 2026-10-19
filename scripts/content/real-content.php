<?php
/**
 * Herit Clothing's real website content, for scripts/content/load-real-content.php.
 *
 * Source: the live heritclothing.com site (read 19 October 2026) and the
 * Journal posts in the old site code (origin/main, src/app/(public)/site/content.js).
 * Imported: the business facts, the About story, mission, vision, how we work,
 * values, who we serve, the services, the journal posts and neutral answers to
 * the live questions. Left out on purpose (D-003, D-013, D-006, D-014): the
 * counters, the four named makers, the testimonials, the press strip, HERIT10,
 * free delivery, the Founders' Drop, the shipping price table, tiered aso-ebi
 * pricing, return windows, the shop products and prices, and social links (the
 * live links have no handle, A12). docs/CONTENT.md records the full list.
 *
 * Rich text uses only what the Website editor round-trips (src/helpers/richText.js):
 * <p>, <h2>, <h3>, <ul><li> and links. "## Heading" sections lay out as bands
 * and cards on the public pages (src/app/(public)/site/storySections.js).
 *
 * Images are named by the files scripts/content/render-prints.mjs writes.
 * Plain British English, no em dashes.
 */

$p = fn(...$lines) => implode("\n", array_map(fn($l) => "<p>$l</p>", $lines));
$h2 = fn($t) => "<h2>$t</h2>";
$h3 = fn($t) => "<h3>$t</h3>";
$join = fn(...$parts) => implode("\n", $parts);

return [
  /* ---- Business profile (Website > Business details) ---------------------- */
  // Only these keys are written. Phone, WhatsApp, hours and social links stay as
  // the owner set them (unknown on the live site, so never filled here).
  'profile' => [
    'business_name' => 'Herit Clothing',
    'business_email' => 'hello@heritclothing.com',
    'business_address' => 'Ajuwon Market, Lagos, Nigeria',
    'business_address_public' => '1',
    'business_area_text' => 'Lagos, Nigeria',
    'journal_enabled' => '1',
  ],

  /* ---- Images (rendered African print illustrations) ---------------------- */
  'caption' => 'Illustration of African print cloth (not a photograph)',

  /* ---- Fixed pages ------------------------------------------------------------ */
  'pages' => [
    'home' => [
      'headline' => 'Wear your heritage.',
      'intro' => 'Your culture, cut for now. Contemporary clothing from Ankara, Adire and Aso-Oke, tailored in Lagos for the way people dress today.',
      'body' => $p('Herit Clothing started in Ajuwon Market, Lagos, in 2024. We make contemporary pieces from traditional cloth, honouring where each fabric comes from, then tailoring it for a modern fit.'),
      'image' => 'page-home',
      'seo_description' => 'Herit Clothing makes contemporary clothing from Ankara, Adire and Aso-Oke in Ajuwon Market, Lagos. Wear your heritage, cut for now.',
    ],
    'fabrics' => [
      'headline' => 'Three cloths, one story.',
      'intro' => 'The fabrics and prints we grew up with deserve a place in everyday life. We name each one and where it comes from.',
      'body' => $join(
        $h2('Ankara'), $p('Bold wax prints in confident colour, cut for everyday wear rather than saved for one occasion.'),
        $h2('Adire'), $p('Hand-dyed indigo. Every resist pattern is made by hand and carries meaning, so no two lengths are ever the same.'),
        $h2('Aso-Oke'), $p('Hand-woven strip cloth, worn for ceremonies. We tailor it so its weight and texture sit well in a modern fit.'),
      ),
    ],
    'about' => [
      'headline' => 'Rooted in Lagos. Made for everywhere.',
      'intro' => 'Herit Clothing began in Ajuwon Market, Lagos, in 2024. We make contemporary clothing from traditional cloth, tailored for the way people dress today.',
      'body' => $join(
        $p(
          'Herit Clothing started in Ajuwon Market, Lagos, with a simple frustration: the fabrics and prints we grew up with (Ankara, Adire, Aso-Oke) were too often saved for special occasions, or treated abroad as costume rather than culture. We believed they deserved a place in everyday life, cut for the way people actually dress today.',
          'So we began making contemporary pieces from traditional cloth, honouring where each fabric comes from, then tailoring it for a modern fit. Today we sell online and in person, dressing customers in Lagos, across Nigeria and around the world. We have grown, but our roots have not moved.'
        ),
        $h2('Our mission'), $p('To celebrate and promote African heritage through clothing, fusing traditional fabrics and prints with contemporary style for the modern African identity.'),
        $h2('Our vision'), $p('A world where African heritage is worn with pride everywhere, and a brand from Lagos can dress customers across the globe without losing its roots.'),
        $h2('How we work'),
        $h3('01 Source with respect'), $p('Heritage fabrics, sourced with care and respect for their origin and meaning.'),
        $h3('02 Design for now'), $p('Contemporary cuts, with each pattern tailored for a modern, everyday fit.'),
        $h3('03 Sell direct, tell the story'), $p('Online and in person, with the story behind every piece.'),
        $h3('04 Deliver, near and far'), $p('Considered, branded packaging, across Lagos, Nigeria and worldwide.'),
        $h2('What we value'),
        $h3('Heritage with intent'), $p('Tradition is our starting point, never a costume. We name each fabric and where it comes from.'),
        $h3('Made for now'), $p('Heritage cloth cut for everyday life, not only for one occasion.'),
        $h3('Proudly Lagos'), $p('Built in Ajuwon Market, made for the world.'),
        $h3('Craft you can feel'), $p('Honest tailoring, with fabrics chosen with care.'),
        $h2('Who we serve'),
        $h3('Lagos and Nigeria'), $p('Style and identity for everyday life, at home.'),
        $h3('The diaspora'), $p('A wearable connection to your roots, wherever you live.'),
        $h3('Gifters'), $p('Meaningful pieces for the people you love, with the story of the cloth.'),
      ),
      'image' => 'page-about',
      'seo_description' => 'Herit Clothing started in Ajuwon Market, Lagos, in 2024, making contemporary clothing from Ankara, Adire and Aso-Oke. Our story, mission and values.',
    ],
    'how_it_works' => [
      'headline' => 'From first message to handover.',
      'intro' => 'Every piece is made to your measurements. This is how an order runs, step by step.',
      'body' => $join(
        $h2('Tell us what you need'), $p('Send an enquiry with the occasion, the date and any photos you like. We aim to reply within one business day.'),
        $h2('Measurement appointment'), $p('We choose the cloth together and take your measurements. You get a written quote before any work starts.'),
        $h2('Cutting and fittings'), $p('Once the quote is agreed, your piece is cut to your pattern and fitted until it sits right.'),
        $h2('Collect your piece'), $p('Pay any balance and collect, or arrange delivery. Your online account shows each stage along the way.'),
      ),
      'image' => 'page-how-it-works',
    ],
    'company' => [
      'headline' => 'Company and uniform orders',
      'intro' => 'One brief for your team, event or wedding party: each wearer measured and listed by name, and one written quote for the whole order.',
      'body' => $p('Share the garment type, the number of pieces and the date you need them. We will discuss a sample and a measurement approach, then send a written quote before any work starts.'),
      'image' => 'page-company',
    ],
    'services_intro' => [
      'headline' => 'What we make',
      'intro' => 'Contemporary clothing from heritage cloth, made to your measurements. Prices depend on the cloth and the finish, so you get a written quote before any work starts.',
      'image' => 'page-services',
    ],
    'contact' => [
      'headline' => "Let's talk.",
      'intro' => 'Tell us what you would like made and when you need it. We aim to reply within one business day.',
      'body' => $p('We are based in Ajuwon Market, Lagos, and dress customers across Nigeria and around the world. Use the form or email us, and include the occasion and the date you need your piece.'),
      'image' => 'page-contact',
    ],
  ],

  /* ---- Home hero slides (in this order) ---------------------------------------- */
  'slides' => [
    'wear-your-heritage' => [
      'label' => 'Wear your heritage', 'eyebrow' => 'Founded in Ajuwon Market, Lagos',
      'headline' => 'Wear your heritage.',
      'lead' => 'Your culture, cut for now. Contemporary clothing from Ankara, Adire and Aso-Oke, made to your measurements.',
      'image' => 'hero-adire',
    ],
    'tailored-for-now' => [
      'label' => 'Made to measure', 'eyebrow' => 'Made to measure',
      'headline' => 'Heritage, tailored for now.',
      'lead' => 'Your fabric, your measurements. Bespoke tailoring for occasions that deserve it.',
      'cta_label' => 'Made to measure', 'cta_path' => '/services/made-to-measure',
      'image' => 'hero-asooke',
    ],
    'aso-ebi' => [
      'label' => 'Aso-ebi and groups', 'eyebrow' => 'Aso-ebi and groups',
      'headline' => 'Matching pieces for weddings and celebrations.',
      'lead' => 'One cloth for the whole party, with each person measured and every piece made to match.',
      'cta_label' => 'Aso-ebi and groups', 'cta_path' => '/services/aso-ebi-and-groups',
      'image' => 'hero-ankara',
    ],
    'made-in-lagos' => [
      'label' => 'Rooted in Lagos', 'eyebrow' => 'Rooted in Lagos',
      'headline' => 'Made in Lagos, worn everywhere.',
      'lead' => 'We dress customers in Lagos, across Nigeria and around the world, without losing our roots.',
      'cta_label' => 'Our story', 'cta_path' => '/about',
      'image' => 'hero-woven',
    ],
  ],

  /* ---- Services (slug => content) ------------------------------------------------ */
  'services' => [
    'made-to-measure' => [
      'title' => 'Made-to-measure',
      'summary' => 'Your fabric, your measurements. Bespoke tailoring for occasions that deserve it.',
      'body' => $p('Bring your own cloth or choose one with us. We take your measurements at an appointment, draft a pattern that is yours alone and fit the piece until it sits right.'),
      'includes' => ['Measurements taken at your appointment', 'A written quote before any work starts', 'Fittings until the piece sits right'],
      'image' => 'service-made-to-measure',
    ],
    'aso-ebi-and-groups' => [
      'title' => 'Aso-ebi and groups',
      'summary' => 'Matching pieces for weddings and celebrations.',
      'body' => $p('Tell us the occasion, the date, the cloth and how many people are wearing it. We measure each person and keep every piece consistent across the group.'),
      'includes' => ['One brief for the whole group', 'Each wearer measured', 'A written quote before any work starts'],
      'image' => 'service-aso-ebi',
    ],
    'gifting' => [
      'title' => 'Gifting',
      'summary' => 'Meaningful pieces, with presentation that matches the meaning. Gift notes included.',
      'body' => $p('Choose a piece for someone you love and we will present it with care, with a note in your words and the story of the cloth.'),
      'includes' => ['A gift note in your words', 'The story of the cloth', 'Considered, branded packaging'],
      'image' => 'service-gifting',
    ],
    'company-and-uniform-orders' => [
      'title' => 'Company and uniform orders',
      'summary' => 'Coordinated clothing for teams, events and staff uniforms, from one brief.',
      'body' => $p('Share the garment type, the number of pieces and the date you need them. We will discuss a sample and a measurement approach, then send a written quote for the whole order.'),
      'includes' => ['One quote for the whole order', 'Each wearer measured and listed by name', 'A sample approved before production starts'],
      'image' => 'service-company',
    ],
  ],

  /* ---- Questions (all four shown on Home) ------------------------------------------ */
  // The live site's returns question is left out: its 14-day window is not confirmed.
  'faqs' => [
    'size' => [
      'question' => 'How do I know my size?',
      'answer' => $p('Our pieces are made to your measurements, taken at a measurement appointment, so there is no size chart to guess from. If you are unsure about anything, send us a message and we will guide you.'),
    ],
    'international' => [
      'question' => 'Do you ship internationally?',
      'answer' => $p('We dress customers in Lagos, across Nigeria and around the world. Tell us where you are when you get in touch, and we will explain the delivery options and any costs for your order before you pay.'),
    ],
    'aso-ebi' => [
      'question' => 'Can I order matching aso-ebi?',
      'answer' => $p('Yes. Send us the occasion, the date, the cloth and how many people are wearing it, and we will come back with a written quote.'),
    ],
    'payments' => [
      'question' => 'How do payments work?',
      'answer' => $p('You get a written quote before any work starts, and the payment terms are agreed in that quote. Every payment you make shows in your online account.'),
    ],
  ],

  /* ---- Journal (slug => post) -------------------------------------------------------- */
  'journal' => [
    'reading-adire-the-language-of-indigo' => [
      'title' => 'Reading Adire: the language of indigo',
      'excerpt' => 'Every resist pattern in hand-dyed Adire carries meaning. Here is how to read the cloth before you wear it.',
      'category' => 'Heritage', 'tile' => 'hc-tile-adire',
      'body' => $p(
        'Adire is not just a fabric: it is a record. Each pattern is made by resisting the indigo dye with starch, stitching or tied raffia, so the cloth keeps a memory of the hands that made it.',
        'Before you wear a piece, look closely. The depth of the indigo tells you how many times it was dipped, and the motifs often carry proverbs and blessings. No two lengths are ever identical, which is exactly the point.',
        'At Herit, we name the fabric and where it comes from, so what you wear carries its story forward.'
      ),
    ],
    'why-we-cut-for-now' => [
      'title' => 'Why we cut for now, not for one occasion',
      'excerpt' => 'Heritage fabric belongs in everyday life. A look at how we tailor traditional cloth for modern wardrobes.',
      'category' => 'Craft', 'tile' => 'hc-tile-asooke',
      'body' => $p(
        'Too often, heritage fabric is saved for one big day a year. We think that is a waste of something beautiful.',
        'So we cut for now: contemporary silhouettes, honest tailoring and finishing you can feel, using the same cloth our grandparents wore. The result is a piece you reach for on a Tuesday, not just for an owambe.',
        'Heritage, tailored for now.'
      ),
    ],
    'from-ajuwon-market-to-your-doorstep' => [
      'title' => 'From Ajuwon Market to your doorstep',
      'excerpt' => 'How a piece travels from the fabric stall to you, wherever you are.',
      'category' => 'Behind the seams', 'tile' => 'hc-tile-ankara',
      'body' => $p(
        'It starts at the fabric stalls of Ajuwon Market, where we choose cloth by hand. From there it is cut, lined and finished in our workroom, then packed with the story of its fabric tucked inside.',
        'We dress customers across Lagos, throughout Nigeria and around the world, so a brand from Lagos can dress you wherever you are, without losing its roots.'
      ),
    ],
  ],
];
