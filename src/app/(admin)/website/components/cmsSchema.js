// What the Website editor shows for each CMS entity. Mirrors CMS_FIELDS in
// php-api/_cms.php (the server validates; this only drives the form). Keep the
// two in step: a field missing here cannot be edited, an extra one is dropped.

export const PAGE_LABELS = {
  home: 'Home',
  about: 'About',
  how_it_works: 'How it works',
  company: 'Company orders',
  services_intro: 'Services introduction',
  contact: 'Contact',
  fabrics: 'Fabric story (Home)',
}
export const PAGE_PATHS = {
  home: '/',
  about: '/about',
  how_it_works: '/how-it-works',
  company: '/company-orders',
  services_intro: '/services',
  contact: '/contact',
  fabrics: '/',
}
export const POLICY_LABELS = { privacy: 'Privacy', terms: 'Terms' }

export const ENTITIES = {
  slide: {
    entity: 'slide',
    path: 'slides',
    label: 'Hero slides',
    one: 'slide',
    ordered: true,
    publicPath: () => '/',
    intro:
      'The full-screen photographs at the top of Home, in this order. A slide needs a headline and a photograph. With none published, Home uses the home page and service photographs.',
  },
  service: {
    entity: 'service',
    path: 'services',
    label: 'Services',
    one: 'service',
    slugged: true,
    ordered: true,
    publicPath: (i) => (i?.slug ? `/services/${i.slug}` : null),
    intro: 'What you make. Each published service gets its own page and appears on Home and in the company brief form.',
  },
  project: {
    entity: 'project',
    path: 'work',
    label: 'Our work',
    one: 'project',
    slugged: true,
    ordered: true,
    publicPath: (i) => (i?.slug ? `/work/${i.slug}` : null),
    intro: 'Finished pieces. A project can be published only with images, alt text and recorded consent.',
  },
  faq: {
    entity: 'faq',
    path: 'faqs',
    label: 'Questions',
    one: 'question',
    ordered: true,
    publicPath: () => '/faqs',
    intro: 'Questions and answers. Tick "Show on Home" for up to four of them.',
  },
  page: {
    entity: 'page',
    path: 'pages',
    label: 'Pages',
    one: 'page',
    keyed: true,
    keys: PAGE_LABELS,
    publicPath: (i) => PAGE_PATHS[i?.key] || null,
    intro: 'The fixed pages of the website. A page that is not published is hidden, with its menu link.',
  },
  policy: {
    entity: 'policy',
    path: 'policies',
    label: 'Policies',
    one: 'policy',
    keyed: true,
    keys: POLICY_LABELS,
    ownerOnly: true,
    publicPath: (i) => (i?.key ? `/${i.key}` : null),
    intro: 'Privacy and terms. Only the owner can publish them, and not while any [owner …] note remains.',
  },
}

export const entityByPath = (path) => Object.values(ENTITIES).find((e) => e.path === path) || null

const SEO = [
  { k: 'seo_title', label: 'Search title (optional)', type: 'text', max: 70, help: 'Shown in search results. Up to 70 characters.' },
  {
    k: 'seo_description',
    label: 'Search description (optional)',
    type: 'textarea',
    max: 170,
    help: 'Up to 170 characters. Without it the summary is used.',
  },
]

/** Field list per entity: type text, textarea, rich, list, media, images, bool, date, service. */
export const FIELDS = {
  slide: [
    {
      k: 'headline',
      label: 'Headline',
      type: 'text',
      max: 90,
      required: true,
      help: 'Short and strong, for example "Cut for you. Finished by hand."',
    },
    {
      k: 'hero_media_id',
      label: 'Photograph',
      type: 'media',
      required: true,
      help: 'A wide photograph works best. It needs alt text before the slide can go live.',
    },
    { k: 'eyebrow', label: 'Small label above the headline (optional)', type: 'text', max: 40 },
    { k: 'lead', label: 'Supporting line (optional)', type: 'textarea', max: 220 },
    {
      k: 'label',
      label: 'Name in the slide bar (optional)',
      type: 'text',
      max: 30,
      help: 'Shown under the progress bar. Without it the headline is used.',
    },
    { k: 'cta_label', label: 'Button text (optional)', type: 'text', max: 40, help: 'Without it the button asks for a measurement appointment.' },
    {
      k: 'cta_path',
      label: 'Button goes to (optional)',
      type: 'text',
      max: 120,
      help: 'A page of this website, starting with /, for example /services or /contact?type=company.',
    },
  ],
  service: [
    { k: 'title', label: 'Title', type: 'text', max: 120, required: true },
    { k: 'summary', label: 'Summary', type: 'textarea', max: 300, help: 'One or two sentences for the card and the page header.' },
    { k: 'hero_media_id', label: 'Image', type: 'media' },
    { k: 'body', label: 'Description', type: 'rich', help: 'Who it is for, what happens, options.' },
    { k: 'includes', label: "What's included", type: 'list', max: 12, help: 'One item per line, up to 12.' },
    {
      k: 'price_note',
      label: 'Pricing note (optional)',
      type: 'text',
      max: 255,
      help: 'For example how the price is worked out. Leave empty to hide.',
    },
    ...SEO,
  ],
  project: [
    { k: 'title', label: 'Title', type: 'text', max: 120, required: true },
    { k: 'summary', label: 'Summary', type: 'textarea', max: 300 },
    { k: 'garment', label: 'Garment', type: 'text', max: 120 },
    { k: 'fabric', label: 'Fabric', type: 'text', max: 120 },
    { k: 'service_slug', label: 'Service', type: 'service' },
    { k: 'cover_media_id', label: 'Cover image', type: 'media', help: 'Shown on cards. Without it the first gallery image is used.' },
    { k: 'images', label: 'Gallery', type: 'images', max: 24 },
    { k: 'body', label: 'Story', type: 'rich', help: 'The brief and the result, in your words. No client names or numbers.' },
    { k: 'featured', label: 'Feature on Home', type: 'bool' },
    ...SEO,
  ],
  faq: [
    { k: 'question', label: 'Question', type: 'text', max: 255, required: true },
    { k: 'answer', label: 'Answer', type: 'rich', required: true },
    { k: 'category', label: 'Group (optional)', type: 'text', max: 40, help: 'Questions with the same group are shown together.' },
    { k: 'show_on_home', label: 'Show on Home', type: 'bool' },
  ],
  policy: [
    { k: 'title', label: 'Title', type: 'text', max: 120, required: true },
    { k: 'effective_date', label: 'Effective from', type: 'date' },
    { k: 'body', label: 'Text', type: 'rich', required: true },
  ],
  page: [
    { k: 'headline', label: 'Headline', type: 'text', max: 160, required: true },
    { k: 'intro', label: 'Introduction', type: 'textarea', max: 600 },
    { k: 'hero_media_id', label: 'Image', type: 'media' },
    { k: 'body', label: 'Main text', type: 'rich' },
    ...SEO,
  ],
}

/** Private project fields: the consent record (never public). */
export const CONSENT_FIELDS = [
  { k: 'own_work', label: 'This is my own work (not made for a client)' },
  { k: 'consent_images', label: 'I may publish these images' },
  { k: 'consent_client', label: 'The client agreed to publication' },
]

/** Plain labels for the reasons cms.php gives for refusing to publish. */
export const problemLabel = (entity, key, msg) => {
  const f = (FIELDS[entity] || []).find((x) => x.k === key)
  if (f) return `${f.label}: ${msg}`
  if (key === 'placeholder') return msg
  if (key === 'consent') return `Consent: ${msg}`
  if (key === 'images') return `Images: ${msg}`
  if (key.startsWith('media.')) return `Image ${key.slice(6)}: ${msg}`
  return `${key}: ${msg}`
}
