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
  // Only these keys are written. Hours and any other social links stay as the
  // owner set them (unknown on the live site, so never filled here).
  'profile' => [
    'business_name' => 'Herit Clothing',
    'business_email' => 'hello@heritclothing.com',
    'business_address' => 'Ajuwon Market, Lagos State, Nigeria',
    'business_address_public' => '1',
    'business_area_text' => 'Lagos, Nigeria',
    'journal_enabled' => '1',
    // Owner, 19 October 2026: Instagram @heritclothing, phone and WhatsApp
    // +234123456789. The number reads like a placeholder: confirm it before
    // loading the live site (KNOWN-ISSUES K-32).
    'business_phone' => '+234123456789',
    'business_whatsapp' => '234123456789',
    'socials' => ['instagram' => 'https://www.instagram.com/heritclothing'],
  ],

  /* ---- Images (rendered African print illustrations) ---------------------- */
  'caption' => 'Illustration of African print cloth (not a photograph)',

  /* ---- Fixed pages ------------------------------------------------------------ */
  'pages' => [
    'home' => [
      'headline' => 'Wear your heritage.',
      'intro' => 'Your culture, cut for now. Clothing in Ankara, Adire and Aso-Oke, tailored in Lagos to your measurements.',
      'body' => $p(
        'Herit Clothing started in Ajuwon Market, Lagos, in 2024. We cut traditional West African cloth for the way people dress now, and we tell you what each fabric is and where it was made before you choose it.',
        'Every order starts with a conversation and a measurement appointment. You get a written quote that names the cloth, the garment and the date before anything is cut, and your online account shows each stage until you collect.'
      ),
      'image' => 'page-home',
      'seo_description' => 'Men\'s clothing in Ankara, Adire and Aso-Oke, cut to your measurements in Ajuwon Market, Lagos. Book a measurement appointment or ask about a company order.',
    ],
    'fabrics' => [
      'headline' => 'The cloth we work with',
      'intro' => 'Three West African cloths, each with its own history, weight and way of wearing. We tell you what each one is and where it comes from before you choose.',
      'body' => $join(
        $h2('Ankara'),
        $p(
          'Cotton printed with a wax-resist method, in strong colours and bold repeating patterns. It is light and breathable, which makes it easy to wear in Lagos heat, and it holds a crisp line when it is cut well.',
          'We cut Ankara for an ordinary day as well as for an occasion: shirts, two-piece sets and kaftans you can wear to work on a Tuesday and again to a party on Saturday.'
        ),
        $h2('Adire'),
        $p(
          'Indigo cloth from south-west Nigeria, dyed by hand. The pattern comes from parts of the cloth that are tied, stitched or painted with starch so the dye cannot reach them, and a deeper blue means more dips in the dye.',
          'Because every length is tied or painted by hand, no two are quite the same. Adire softens with wear and suits shirts, kaftans and relaxed agbada.'
        ),
        $h2('Aso-Oke'),
        $p(
          'Narrow strips woven by hand on a loom and sewn edge to edge into a wider cloth. It is heavier and firmer than printed cloth, with a texture you can feel, and it is the cloth people choose for weddings and ceremonies.',
          'We cut Aso-Oke so its weight hangs well in a modern fit: agbada, fila and ceremonial sets that keep their shape through a long day.'
        ),
      ),
    ],
    'about' => [
      'headline' => 'A workroom in Ajuwon Market',
      'intro' => 'We have made clothing from traditional West African cloth in Ajuwon Market, Lagos, since 2024, cut and fitted for everyday wear.',
      'body' => $join(
        $p(
          'We started Herit Clothing because the cloth we grew up with (Ankara, Adire, Aso-Oke) was mostly kept for big occasions, and abroad it was often treated as costume. We wanted to wear it on an ordinary day, in cuts that fit the way people dress now.',
          'So we cut traditional cloth to patterns drafted for each customer, and we tell you what each fabric is and where it was made. We work by appointment, sell online and in person, and make pieces for customers in Lagos, elsewhere in Nigeria and abroad.'
        ),
        $h2('Our mission'), $p('To celebrate and promote African heritage through clothing, fusing traditional fabrics and prints with contemporary style for the modern African identity.'),
        $h2('Our vision'), $p('A world where African heritage is worn with pride everywhere, and a brand from Lagos can dress customers across the globe without losing its roots.'),
        $h2('How we work'),
        $h3('01 Choose the cloth'), $p('We buy cloth knowing where it was made and what its pattern means, and you are welcome to bring your own.'),
        $h3('02 Measure once'), $p('Your measurements are taken at an appointment and kept on your record for the next order.'),
        $h3('03 Cut it for now'), $p('Each piece is drafted to your measurements in a cut you can wear every day, then fitted until it sits right.'),
        $h3('04 Hand it over'), $p('Collected from us, or delivered in Lagos, elsewhere in Nigeria or abroad, with the cost agreed before you pay.'),
        $h2('What we value'),
        $h3('Cloth, not costume'), $p('We name each fabric and where it comes from, so you know what you are wearing.'),
        $h3('For an ordinary day'), $p('Traditional cloth cut for everyday wear, not only for one occasion a year.'),
        $h3('From Lagos'), $p('Our workroom is in Ajuwon Market, and our customers are in Nigeria and abroad.'),
        $h3('Fitted until it sits right'), $p('Every piece is cut to a pattern drafted for you and fitted before you take it home.'),
        $h2('Who we serve'),
        $h3('Lagos and Nigeria'), $p('Clothes in our own cloth for work, church, weddings and weekends, made to your measurements.'),
        $h3('Nigerians abroad'), $p('Cloth from home, made to your measurements and sent to you, with the delivery cost agreed first.'),
        $h3('Teams and families'), $p('Matching pieces for a wedding party, a family occasion or a company, with each person measured.'),
      ),
      'image' => 'page-about',
      'seo_description' => 'Herit Clothing started in Ajuwon Market, Lagos, in 2024, making contemporary clothing from Ankara, Adire and Aso-Oke. Our story, mission, values and how we work.',
    ],
    'how_it_works' => [
      'headline' => 'From first message to handover.',
      'intro' => 'Every piece is made to your measurements. This is how an order runs, step by step, and what you see at each stage.',
      'body' => $join(
        $h2('Tell us what you need'), $p('Send an enquiry with the occasion, the date and any photos you like. We aim to reply within one business day and arrange a measurement appointment.'),
        $h2('Measurement appointment'), $p('We meet, choose the cloth together and take your measurements. You get a written quote with the cloth, the garment, the price and the date before any work starts.'),
        $h2('Cutting and fittings'), $p('Once you accept the quote, your piece is cut to your pattern and fitted until it sits right. If anything changes after a fitting, we agree it with you first.'),
        $h2('Collect your piece'), $p('Pay any balance and collect, or arrange delivery. Your online account shows each stage, every payment and your next appointment along the way.'),
      ),
      'image' => 'page-how-it-works',
    ],
    'company' => [
      'headline' => 'Company and uniform orders',
      'intro' => 'One brief for your team, event or wedding party: each wearer measured and listed by name, and one written quote for the whole order.',
      'body' => $join(
        $p(
          'Company orders are for groups who need matching clothing: staff uniforms, event wear, a wedding party or a family celebration. You deal with one contact, approve one sample and get one written quote for the whole order.',
          'Share the garment type, the number of pieces and the date you need them. We discuss the cloth, a sample and how each person will be measured, then send the quote before any work starts.'
        ),
        $h2('What to send us'),
        $h3('The garment'), $p('What you need made, for example shirts, kaftans or two-piece sets, and any photos of the look you want.'),
        $h3('The numbers'), $p('An approximate number of pieces and wearers, and the date the order is needed by.'),
        $h3('The cloth'), $p('Whether you supply the cloth or would like us to source it, and any colours or brand guidance.'),
        $h2('How a company order runs'),
        $h3('One quote'), $p('A single written quote for the order, billed to your company, with the payment terms agreed in it.'),
        $h3('Each wearer by name'), $p('Every person is measured and listed, so you can see who has been measured and who has collected.'),
        $h3('Sample first'), $p('A sample is made and approved before production starts, so the whole order matches what you signed off.'),
        $h3('Handover item by item'), $p('Each piece is recorded as it is handed over, so nothing goes missing between the workroom and your team.'),
      ),
      'image' => 'page-company',
    ],
    'services_intro' => [
      'headline' => 'What we make',
      'intro' => 'Contemporary clothing from heritage cloth, made to your measurements. Prices depend on the cloth and the finish, so you get a written quote before any work starts.',
      'image' => 'page-services',
    ],
    'contact' => [
      'headline' => 'Start with one message.',
      'intro' => 'Tell us what you would like made and when you need it. We aim to reply within one business day and arrange your measurement appointment.',
      'body' => $join(
        $p('We are based in Ajuwon Market, Lagos, and dress customers across Nigeria and around the world. Use the form, email us or send a WhatsApp message.'),
        $h2('What to include'),
        $p('The garment you have in mind, the occasion and the date you need it, whether you have your own cloth, and any photos of the look you like. For a group or a company, add the number of people.'),
      ),
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
      'lead' => 'Bring your own cloth or choose one with us. We take your measurements, draft your pattern and fit the piece until it sits right.',
      'cta_label' => 'How made-to-measure works', 'cta_path' => '/services/made-to-measure',
      'image' => 'hero-asooke',
    ],
    'aso-ebi' => [
      'label' => 'Aso-ebi and groups', 'eyebrow' => 'Aso-ebi and groups',
      'headline' => 'Matching pieces for weddings and celebrations.',
      'lead' => 'One cloth for the whole party, with each person measured and every piece made to match.',
      'cta_label' => 'Aso-ebi for your group', 'cta_path' => '/services/aso-ebi-and-groups',
      'image' => 'hero-ankara',
    ],
    'made-in-lagos' => [
      'label' => 'Rooted in Lagos', 'eyebrow' => 'Rooted in Lagos',
      'headline' => 'Made in Ajuwon Market, Lagos.',
      'lead' => 'We make pieces for customers in Lagos, elsewhere in Nigeria and abroad.',
      'cta_label' => 'Our story', 'cta_path' => '/about',
      'image' => 'hero-woven',
    ],
  ],

  /* ---- Services (slug => content) ------------------------------------------------ */
  'services' => [
    'made-to-measure' => [
      'title' => 'Made-to-measure',
      'summary' => 'Your cloth or ours, cut to a pattern drafted from your measurements and fitted until it sits right.',
      'body' => $join(
        $p(
          'Made-to-measure is our main service: one garment, cut to one person. Bring your own cloth or choose one with us, and we draft a pattern from your own measurements rather than a standard size.',
          'It suits shirts, kaftans, agbada, two-piece sets and trousers, for work, church, weddings and weekends.'
        ),
        $h2('At your appointment'),
        $p('We talk through the garment, the occasion and the date, look at the cloth together and take your measurements. They are kept on your record in centimetres or inches, so your next order starts from the same numbers.'),
        $h2('Your quote and fittings'),
        $p('You get a written quote with the cloth, the garment, the price and the date before any work starts. After cutting we fit the piece with you and adjust it until it sits right, then you collect it or we deliver it.'),
      ),
      'includes' => ['Measurements taken at your appointment and kept on your record', 'A written quote before any work starts', 'Fittings until the piece sits right', 'Your order followed online, stage by stage'],
      'image' => 'service-made-to-measure',
    ],
    'aso-ebi-and-groups' => [
      'title' => 'Aso-ebi and groups',
      'summary' => 'One cloth for the whole party, with each person measured and every piece made to match.',
      'body' => $join(
        $p(
          'Aso-ebi is the shared cloth a wedding party, a family or friends wear together. We make the pieces so they match across the group while each one fits the person wearing it.',
          'Tell us the occasion, the date, the cloth and how many people are wearing it, and whether everyone wears the same style.'
        ),
        $h2('How a group order runs'),
        $p('We agree the style and the cloth with you first, then measure each person, at our workroom or from measurements they send for us to check. One written quote covers the group, and each person is listed so you can see who has been measured and who has collected.'),
      ),
      'includes' => ['One brief for the whole group', 'Each wearer measured and listed by name', 'A written quote before any work starts', 'Pieces made to match across the group'],
      'image' => 'service-aso-ebi',
    ],
    'gifting' => [
      'title' => 'Gifting',
      'summary' => 'A piece made as a gift, wrapped, with a note in your words and a card about its cloth.',
      'body' => $join(
        $p(
          'Choose a piece for someone and we make it, wrap it and add a note in your words with a card about the cloth it is made from.',
          'If the piece is made to measure, we will talk with you about the best way to get the measurements without spoiling the surprise.'
        ),
        $h2('What to tell us'),
        $p('Who the gift is for, the occasion and the date, and the cloth or style you have in mind. We reply with the options and a written quote.'),
      ),
      'includes' => ['A gift note in your words', 'A card about the cloth', 'Wrapped for giving', 'A written quote before any work starts'],
      'image' => 'service-gifting',
    ],
    'company-and-uniform-orders' => [
      'title' => 'Company and uniform orders',
      'summary' => 'Uniforms and event wear for a team, from one brief, one sample and one quote.',
      'body' => $join(
        $p(
          'For staff uniforms, event wear and other orders where a group needs matching clothing. You deal with one contact and get one written quote, billed to your company.',
          'Share the garment type, the number of pieces and the date you need them. We will discuss the cloth, a sample and how each person will be measured.'
        ),
        $h2('From sample to handover'),
        $p('A sample is made and approved before production starts. Each wearer is measured and listed by name, and every piece is recorded as it is handed over, so you always know where the order stands.'),
      ),
      'includes' => ['One quote for the whole order', 'Each wearer measured and listed by name', 'A sample approved before production starts', 'Handover recorded item by item'],
      'image' => 'service-company',
    ],
  ],

  /* ---- Questions (Home shows up to four marked Show on Home; all on /faqs) ---------- */
  // The live site's returns question is left out: its 14-day window is not confirmed.
  // No durations or prices: those are agreed in each written quote.
  'faqs' => [
    'size' => [
      'question' => 'How do I know my size?',
      'answer' => $p('Our pieces are made to your measurements, taken at a measurement appointment, so there is no size chart to guess from. If you are unsure about anything, send us a message and we will guide you.'),
    ],
    'appointment' => [
      'question' => 'What happens at a measurement appointment?',
      'answer' => $p('We talk through the garment, the occasion and the date, look at the cloth together and take your measurements. Afterwards you get a written quote with the cloth, the garment, the price and the date. Nothing is cut until you accept it.'),
    ],
    'own-cloth' => [
      'question' => 'Can I bring my own cloth?',
      'answer' => $p('Yes. Bring your own cloth to the appointment, or choose one with us. We will tell you if a cloth suits the garment you have in mind and how much of it the piece needs.'),
    ],
    'how-long' => [
      'question' => 'How long does a piece take?',
      'answer' => $p('It depends on the garment, the cloth and how many fittings it needs. The date is agreed with you in the written quote, and your online account shows the stage your piece is at.'),
    ],
    'international' => [
      'question' => 'Do you ship internationally?',
      'answer' => $p('We dress customers in Lagos, across Nigeria and around the world. Tell us where you are when you get in touch, and we will explain the delivery options and any costs for your order before you pay.'),
    ],
    'payments' => [
      'question' => 'How do payments work?',
      'answer' => $p('You get a written quote before any work starts, and the payment terms are agreed in that quote. Every payment you make shows in your online account.'),
    ],
    'aso-ebi' => [
      'question' => 'Can I order matching aso-ebi?',
      'answer' => $p('Yes. Send us the occasion, the date, the cloth and how many people are wearing it, and we will come back with a written quote. Each person is measured, and the pieces are made to match.'),
    ],
    'measurements-kept' => [
      'question' => 'Do you keep my measurements?',
      'answer' => $p('Yes. Your measurements stay on your customer record, so the next order starts from the same numbers. If your measurements change, you can send new ones and we check them before they are used.'),
    ],
    'changes' => [
      'question' => 'What if I want a change after a fitting?',
      'answer' => $p('Fittings are there to get the piece right, so tell us what you would like changed. If a change alters the agreed quote, we send you an updated quote to accept first.'),
    ],
    'track' => [
      'question' => 'How do I follow my order?',
      'answer' => $p('Use Track your job on the website, or sign in to your account. It shows the stage your piece is at, the payments you have made and your next appointment.'),
    ],
  ],

  /* ---- Journal (slug => post) -------------------------------------------------------- */
  'journal' => [
    'reading-adire-the-language-of-indigo' => [
      'title' => 'Reading Adire: the language of indigo',
      'excerpt' => 'How Adire patterns are made, and what to look for in the cloth before you wear it.',
      'category' => 'Heritage', 'tile' => 'hc-tile-adire',
      'body' => $join(
        $p(
          'Adire is indigo cloth from south-west Nigeria. The pattern is made by keeping the dye off parts of the cloth: painting them with starch, stitching them tight or tying them with raffia before the cloth goes into the dye.'
        ),
        $h2('What to look for'),
        $p(
          'Look closely before you wear a piece. A darker blue means the cloth was dipped more times. Many motifs have names, and some stand for proverbs. Because each length is tied or painted by hand, two lengths of the same pattern still differ.'
        ),
        $h2('Wearing it'),
        $p(
          'Adire softens with wear and washing, so a shirt or kaftan gets more comfortable over time. When you buy from us we tell you which cloth a piece is made from and where it came from.'
        ),
      ),
    ],
    'why-we-cut-for-now' => [
      'title' => 'Why we cut for now, not for one occasion',
      'excerpt' => 'Why we cut traditional cloth for everyday wear, and what changes when we do.',
      'category' => 'Craft', 'tile' => 'hc-tile-asooke',
      'body' => $join(
        $p(
          'A lot of traditional cloth comes out once a year, for one big day, and spends the rest of the year folded away.'
        ),
        $h2('A different starting point'),
        $p(
          'We cut the same cloth our grandparents wore into shapes people wear now: shirts, trousers and jackets drafted to your measurements and finished in our workroom. The aim is a piece you put on for a Tuesday at work as well as for an owambe.'
        ),
        $h2('What changes in the cut'),
        $p(
          'Everyday wear needs room to move and a cloth that breathes. We choose the cloth with the garment in mind and fit it with you, so it sits right when you sit, stand and walk.'
        ),
      ),
    ],
    'from-ajuwon-market-to-your-doorstep' => [
      'title' => 'From Ajuwon Market to your doorstep',
      'excerpt' => 'How a piece travels from the fabric stall to you, wherever you are.',
      'category' => 'Behind the seams', 'tile' => 'hc-tile-ankara',
      'body' => $join(
        $p(
          'It starts at the fabric stalls of Ajuwon Market, where we choose cloth by hand.'
        ),
        $h2('In the workroom'),
        $p(
          'The piece is cut to your pattern, fitted with you and finished in our workroom, then packed with a card about its cloth.'
        ),
        $h2('To you'),
        $p(
          'You can collect it from us, or we deliver it in Lagos, elsewhere in Nigeria or abroad. We tell you the delivery cost before you pay, and your account shows when the piece is ready.'
        ),
      ),
    ],
  ],

];
