import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Button, Table, Form, Modal, Spinner, Alert, Badge, Row, Col } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';

const TILES = [
  { v: 'hc-tile-ankara', l: 'Ankara' },
  { v: 'hc-tile-adire', l: 'Adire' },
  { v: 'hc-tile-asooke', l: 'Aso-Oke' },
  { v: 'hc-tile-mixed', l: 'Mixed' },
  { v: 'hc-tile-ff', l: 'Founders' },
];
const CATEGORIES = ['Heritage', 'Craft', 'Behind the seams', 'Style', 'News'];

// Brand context prepended to every platform prompt so output stays on-voice.
const BRAND = 'Herit Clothing — contemporary African fashion in heritage fabrics (Ankara, Adire, Aso-Oke), hand-made in Ajuwon Market, Lagos, shipped worldwide. Brand voice: warm, rooted, confident; UK English; no fluff.';

// One idea → a tailored post per platform. `channel` maps to the Marketing
// planner's channel set (null = generate/copy only, not schedulable there).
const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: 'mdi:instagram', channel: 'instagram',
    frame: (idea, type) => `Write an Instagram caption for ${BRAND} Content type: ${type}. Idea: "${idea}". Strong first-line hook, 3–5 short lines, 1–2 tasteful emojis, one clear CTA, then 6–8 relevant hashtags on a new line.` },
  { key: 'tiktok', label: 'TikTok', icon: 'ic:baseline-tiktok', channel: 'tiktok',
    frame: (idea, type) => `For ${BRAND} Content type: ${type}. Idea: "${idea}". Give a punchy TikTok caption (1–2 lines + 4–6 hashtags) AND a 3-beat video hook idea (Hook / Show / CTA), each one line.` },
  { key: 'x', label: 'X (Twitter)', icon: 'mdi:twitter', channel: null,
    frame: (idea, type) => `For ${BRAND} Content type: ${type}. Idea: "${idea}". Write one X/Twitter post under 260 characters — punchy, a touch of personality, 1–2 hashtags.` },
  { key: 'facebook', label: 'Facebook', icon: 'mdi:facebook', channel: 'facebook',
    frame: (idea, type) => `For ${BRAND} Content type: ${type}. Idea: "${idea}". Write a Facebook post: 2–3 friendly sentences, a clear CTA, 2–3 hashtags.` },
  { key: 'linkedin', label: 'LinkedIn', icon: 'mdi:linkedin', channel: null,
    frame: (idea, type) => `For ${BRAND} Content type: ${type}. Idea: "${idea}". Write a LinkedIn post with a brand-story / craft angle — 1 short paragraph, professional but warm, 3 hashtags.` },
  { key: 'whatsapp', label: 'WhatsApp broadcast', icon: 'mdi:whatsapp', channel: 'whatsapp',
    frame: (idea, type) => `For ${BRAND} Content type: ${type}. Idea: "${idea}". Write a short WhatsApp broadcast (2 lines max, warm, one CTA, an emoji or two). No hashtags.` },
];
const CTYPES = ['Product drop', 'Restock', 'Announcement', 'Story / education', 'Promo / sale', 'Behind the scenes'];

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const EMPTY_POST = { id: 0, title: '', slug: '', category: 'Heritage', tile: 'hc-tile-adire', tags: '', excerpt: '', body: '', status: 'draft' };
const EMPTY_TESTI = { id: 0, name: '', location: '', quote: '', rating: 5, tile: 'hc-tile-ankara', featured: 1, status: 'published', sort: 0 };

const aiText = (res) => res?.text || res?.content || res?.result || '';

const ContentPage = () => {
  const [tab, setTab] = useState('blog');
  const [posts, setPosts] = useState([]);
  const [testis, setTestis] = useState([]);
  const [state, setState] = useState('loading');
  const [err, setErr] = useState('');

  const [post, setPost] = useState(null);     // blog editor (null = closed)
  const [testi, setTesti] = useState(null);   // testimonial editor
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState('');

  // composer
  const [idea, setIdea] = useState('');
  const [ctype, setCtype] = useState(CTYPES[0]);
  const [picked, setPicked] = useState({ instagram: true, tiktok: true, x: true, facebook: true, linkedin: false, whatsapp: false });
  const [results, setResults] = useState(null);   // { platform: text } + { hashtags }
  const [genBusy, setGenBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [plannerMsg, setPlannerMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, t] = await Promise.all([heritApi.content.blogList(), heritApi.content.testiList()]);
      setPosts(b.posts || []);
      setTestis(t.testimonials || []);
      setState('ready');
    } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ---- blog ---- */
  const editPost = async (id) => {
    if (!id) { setPost({ ...EMPTY_POST }); return; }
    try { const full = await heritApi.content.blogGet(id); setPost({ ...EMPTY_POST, ...full }); }
    catch { setErr('Could not open that post.'); }
  };
  const savePost = async () => {
    if (!post.title.trim()) { setErr('Give the post a title.'); return; }
    setBusy(true); setErr('');
    try {
      await heritApi.content.blogSave({ ...post, slug: post.slug || slugify(post.title) });
      setPost(null); await load();
    } catch (e) { setErr(e.message || 'Could not save the post.'); }
    finally { setBusy(false); }
  };
  const delPost = async (id) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try { await heritApi.content.blogDelete(id); await load(); } catch { setErr('Could not delete.'); }
  };
  const aiDraft = async () => {
    if (!post.title.trim()) { setErr('Add a title first so the AI knows the topic.'); return; }
    setAiBusy('draft'); setErr('');
    try {
      const res = await heritApi.ai('blog_draft',
        `Write a blog post for Herit Clothing's Journal — contemporary African fashion in heritage fabrics (Ankara, Adire, Aso-Oke), made in Lagos. Brand voice: warm, rooted, confident; UK English; no marketing fluff. 3–5 short paragraphs wrapped in <p> tags only (no headings). Topic: "${post.title}".${post.excerpt ? ` Angle: ${post.excerpt}` : ''}`);
      const text = aiText(res);
      if (text) setPost((p) => ({ ...p, body: text }));
      else setErr('AI returned nothing — check ai.php + OpenRouter key.');
    } catch (e) { setErr(e.message || 'AI is unavailable.'); }
    finally { setAiBusy(''); }
  };
  const aiExcerpt = async () => {
    if (!post.title.trim()) { setErr('Add a title first.'); return; }
    setAiBusy('excerpt'); setErr('');
    try {
      const res = await heritApi.ai('blog_excerpt',
        `Write a single-sentence excerpt (max 24 words) for a Herit Clothing Journal post titled "${post.title}". Warm, on-brand. Return only the sentence.`);
      const text = aiText(res).trim().replace(/^["']|["']$/g, '');
      if (text) setPost((p) => ({ ...p, excerpt: text }));
    } catch (e) { setErr(e.message || 'AI is unavailable.'); }
    finally { setAiBusy(''); }
  };
  const aiHashtags = async () => {
    if (!post.title.trim()) { setErr('Add a title first.'); return; }
    setAiBusy('tags'); setErr('');
    try {
      const res = await heritApi.ai('hashtags',
        `Suggest 6–8 relevant, on-brand hashtags plus 3 SEO keywords for a Herit Clothing post titled "${post.title}" (African heritage fashion, Lagos). Return one comma-separated line, no explanation.`);
      const text = aiText(res).replace(/\n/g, ', ').trim();
      if (text) setPost((p) => ({ ...p, tags: text }));
    } catch (e) { setErr(e.message || 'AI is unavailable.'); }
    finally { setAiBusy(''); }
  };

  /* ---- testimonials ---- */
  const saveTesti = async () => {
    if (!testi.name.trim() || !testi.quote.trim()) { setErr('Name and quote are required.'); return; }
    setBusy(true); setErr('');
    try { await heritApi.content.testiSave(testi); setTesti(null); await load(); }
    catch (e) { setErr(e.message || 'Could not save.'); }
    finally { setBusy(false); }
  };
  const delTesti = async (id) => {
    if (!window.confirm('Delete this testimonial?')) return;
    try { await heritApi.content.testiDelete(id); await load(); } catch { setErr('Could not delete.'); }
  };

  /* ---- composer ---- */
  const selectedPlatforms = PLATFORMS.filter((p) => picked[p.key]);
  const generateAll = async () => {
    if (!idea.trim()) { setErr('Tell the composer what the post is about.'); return; }
    if (!selectedPlatforms.length) { setErr('Pick at least one platform.'); return; }
    setGenBusy(true); setErr(''); setResults(null); setPlannerMsg('');
    try {
      const jobs = selectedPlatforms.map((p) =>
        heritApi.ai(`composer_${p.key}`, p.frame(idea.trim(), ctype))
          .then((r) => ({ key: p.key, text: aiText(r) }))
          .catch(() => ({ key: p.key, text: '' })));
      // AI-suggested hashtags + keywords (no paid trends API; on-brand guesses)
      jobs.push(
        heritApi.ai('composer_hashtags',
          `For ${BRAND} Idea: "${idea.trim()}" (${ctype}). List 12–15 relevant hashtags (mix broad + niche African-fashion/Lagos tags) on one line, then a second line "Keywords: " with 5 SEO keywords. No other text.`)
          .then((r) => ({ key: '_hashtags', text: aiText(r) }))
          .catch(() => ({ key: '_hashtags', text: '' })));
      const settled = await Promise.all(jobs);
      const map = {};
      settled.forEach((s) => { map[s.key] = s.text; });
      if (!Object.values(map).some(Boolean)) setErr('AI returned nothing — check ai.php + OpenRouter key.');
      setResults(map);
    } catch (e) { setErr(e.message || 'AI is unavailable.'); }
    finally { setGenBusy(false); }
  };
  const copyText = (key, text) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500); };
  const copyAll = () => {
    if (!results) return;
    const blob = selectedPlatforms.map((p) => `— ${p.label} —\n${results[p.key] || ''}`).join('\n\n')
      + (results._hashtags ? `\n\n— Hashtags & keywords —\n${results._hashtags}` : '');
    copyText('all', blob);
  };
  const saveToPlanner = async () => {
    if (!results) return;
    setPlannerMsg('saving');
    const primary = selectedPlatforms.find((p) => p.channel) || PLATFORMS[0];
    const notes = selectedPlatforms.map((p) => `[${p.label}]\n${results[p.key] || ''}`).join('\n\n')
      + (results._hashtags ? `\n\n[Hashtags & keywords]\n${results._hashtags}` : '');
    try {
      await heritApi.marketing.create({
        name: idea.trim().slice(0, 80), channel: primary.channel || 'instagram',
        goal: ctype, starts_on: '', ends_on: '', notes,
      });
      setPlannerMsg('done'); setTimeout(() => setPlannerMsg(''), 2500);
    } catch (e) { setErr(e.message || 'Could not add to the planner.'); setPlannerMsg(''); }
  };

  return (
    <>
      <PageTitle title="Content" />
      <div className="mb-3">
        <h4 className="mb-1">Content hub</h4>
        <p className="text-muted mb-0">The public Journal and the testimonials shown on the website.</p>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && (
        <Alert variant="warning">
          <strong>Content API offline.</strong> Upload <code>php-api/content.php</code> and the public reads in <code>store.php</code>,
          then import <code>schema_phase16.sql</code> (creates <code>blog_posts</code> + <code>testimonials</code>).
        </Alert>
      )}

      {state === 'ready' && (
        <>
          <div className="btn-group mb-3" role="tablist">
            <Button variant={tab === 'blog' ? 'primary' : 'light'} onClick={() => setTab('blog')}>
              <IconifyIcon icon="solar:notebook-bold" className="me-1" /> Journal ({posts.length})
            </Button>
            <Button variant={tab === 'testi' ? 'primary' : 'light'} onClick={() => setTab('testi')}>
              <IconifyIcon icon="solar:chat-square-like-bold" className="me-1" /> Testimonials ({testis.length})
            </Button>
            <Button variant={tab === 'composer' ? 'primary' : 'light'} onClick={() => setTab('composer')}>
              <IconifyIcon icon="solar:magic-stick-3-bold" className="me-1" /> AI Composer
            </Button>
          </div>

          {err && <Alert variant="danger" className="py-2" dismissible onClose={() => setErr('')}>{err}</Alert>}

          {tab === 'blog' && (
            <Card><CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Journal posts</h5>
                <Button size="sm" onClick={() => editPost(0)}><IconifyIcon icon="solar:add-circle-bold" className="me-1" /> New post</Button>
              </div>
              <Table responsive hover className="align-middle mb-0">
                <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Published</th><th /></tr></thead>
                <tbody>
                  {posts.length === 0 && <tr><td colSpan={5} className="text-muted text-center py-4">No posts yet. Create your first story.</td></tr>}
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td className="fw-semibold">{p.title}</td>
                      <td className="text-muted">{p.category || '—'}</td>
                      <td><Badge bg={p.status === 'published' ? 'success' : 'secondary'}>{p.status}</Badge></td>
                      <td className="text-muted small">{p.published_at ? p.published_at.slice(0, 10) : '—'}</td>
                      <td className="text-end">
                        <Button size="sm" variant="light" className="me-1" onClick={() => editPost(p.id)}><IconifyIcon icon="solar:pen-2-linear" /></Button>
                        <Button size="sm" variant="light" onClick={() => delPost(p.id)}><IconifyIcon icon="solar:trash-bin-trash-linear" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody></Card>
          )}

          {tab === 'testi' && (
            <Card><CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Testimonials</h5>
                <Button size="sm" onClick={() => setTesti({ ...EMPTY_TESTI })}><IconifyIcon icon="solar:add-circle-bold" className="me-1" /> New</Button>
              </div>
              <Table responsive hover className="align-middle mb-0">
                <thead><tr><th>Name</th><th>Location</th><th>Rating</th><th>Featured</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {testis.length === 0 && <tr><td colSpan={6} className="text-muted text-center py-4">No testimonials yet.</td></tr>}
                  {testis.map((t) => (
                    <tr key={t.id}>
                      <td className="fw-semibold">{t.name}</td>
                      <td className="text-muted">{t.location || '—'}</td>
                      <td>{'★'.repeat(t.rating)}</td>
                      <td>{Number(t.featured) ? <Badge bg="warning" text="dark">Featured</Badge> : '—'}</td>
                      <td><Badge bg={t.status === 'published' ? 'success' : 'secondary'}>{t.status}</Badge></td>
                      <td className="text-end">
                        <Button size="sm" variant="light" className="me-1" onClick={() => setTesti({ ...EMPTY_TESTI, ...t, featured: Number(t.featured) })}><IconifyIcon icon="solar:pen-2-linear" /></Button>
                        <Button size="sm" variant="light" onClick={() => delTesti(t.id)}><IconifyIcon icon="solar:trash-bin-trash-linear" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody></Card>
          )}

          {tab === 'composer' && (
            <Row className="g-3">
              <Col lg={4}>
                <Card><CardBody>
                  <h5 className="mb-1">One idea, every platform</h5>
                  <p className="text-muted small mb-3">AI writes a tailored post for each channel, with on-brand hashtags &amp; keywords.</p>
                  <Form.Group className="mb-3">
                    <Form.Label>What&apos;s the post about?</Form.Label>
                    <Form.Control as="textarea" rows={3} value={idea} onChange={(e) => setIdea(e.target.value)}
                      placeholder="e.g. Founders' Drop — limited Adire wrap dresses, 10% off first order with HERIT10" />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Type</Form.Label>
                    <Form.Select value={ctype} onChange={(e) => setCtype(e.target.value)}>
                      {CTYPES.map((c) => <option key={c}>{c}</option>)}
                    </Form.Select>
                  </Form.Group>
                  <Form.Label>Platforms</Form.Label>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {PLATFORMS.map((p) => (
                      <Button key={p.key} size="sm" variant={picked[p.key] ? 'primary' : 'outline-secondary'}
                        onClick={() => setPicked((o) => ({ ...o, [p.key]: !o[p.key] }))}>
                        <IconifyIcon icon={p.icon} className="me-1" />{p.label}
                      </Button>
                    ))}
                  </div>
                  <Button className="w-100" onClick={generateAll} disabled={genBusy}>
                    {genBusy ? <><Spinner size="sm" className="me-1" /> Writing…</> : <><IconifyIcon icon="solar:magic-stick-3-bold" className="me-1" /> Generate all</>}
                  </Button>
                </CardBody></Card>
              </Col>

              <Col lg={8}>
                {!results && !genBusy && (
                  <Card><CardBody className="text-center text-muted py-5">
                    <IconifyIcon icon="solar:magic-stick-3-bold-duotone" style={{ fontSize: '2.5rem' }} />
                    <p className="mt-2 mb-0">Your platform-ready posts will appear here.</p>
                  </CardBody></Card>
                )}
                {genBusy && <Card><CardBody className="text-center py-5"><Spinner /><p className="text-muted mt-2 mb-0">Writing on-brand copy for each platform…</p></CardBody></Card>}
                {results && (
                  <>
                    <div className="d-flex justify-content-end gap-2 mb-2">
                      <Button size="sm" variant="light" onClick={copyAll}>
                        <IconifyIcon icon={copied === 'all' ? 'solar:check-circle-bold' : 'solar:copy-linear'} className="me-1" />{copied === 'all' ? 'Copied' : 'Copy all'}
                      </Button>
                      <Button size="sm" variant="primary" onClick={saveToPlanner} disabled={plannerMsg === 'saving'}>
                        {plannerMsg === 'saving' ? <Spinner size="sm" /> : plannerMsg === 'done' ? <><IconifyIcon icon="solar:check-circle-bold" className="me-1" />Added</> : <><IconifyIcon icon="solar:calendar-add-bold" className="me-1" />Save to planner</>}
                      </Button>
                    </div>
                    <Row className="g-3">
                      {selectedPlatforms.map((p) => (
                        <Col md={6} key={p.key}>
                          <Card className="h-100"><CardBody>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-semibold d-inline-flex align-items-center gap-1"><IconifyIcon icon={p.icon} /> {p.label}</span>
                              <Button size="sm" variant="light" onClick={() => copyText(p.key, results[p.key] || '')}>
                                <IconifyIcon icon={copied === p.key ? 'solar:check-circle-bold' : 'solar:copy-linear'} />
                              </Button>
                            </div>
                            <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{results[p.key] || '—'}</pre>
                          </CardBody></Card>
                        </Col>
                      ))}
                      {results._hashtags && (
                        <Col xs={12}>
                          <Card className="border-warning"><CardBody>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-semibold d-inline-flex align-items-center gap-1"><IconifyIcon icon="solar:hashtag-bold" /> Hashtags &amp; keywords</span>
                              <Button size="sm" variant="light" onClick={() => copyText('_hashtags', results._hashtags)}>
                                <IconifyIcon icon={copied === '_hashtags' ? 'solar:check-circle-bold' : 'solar:copy-linear'} />
                              </Button>
                            </div>
                            <pre className="mb-0 small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{results._hashtags}</pre>
                          </CardBody></Card>
                        </Col>
                      )}
                    </Row>
                    <p className="text-muted small mt-2 mb-0">Hashtags are AI-suggested from the brand &amp; niche — not live-trending. Review before posting.</p>
                  </>
                )}
              </Col>
            </Row>
          )}
        </>
      )}

      {/* ---- blog editor ---- */}
      <Modal show={!!post} onHide={() => setPost(null)} size="lg" scrollable>
        <Modal.Header closeButton><Modal.Title>{post?.id ? 'Edit post' : 'New post'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {post && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value, slug: post.slug || slugify(e.target.value) })} placeholder="Reading Adire: the language of indigo" />
              </Form.Group>
              <Row className="g-2">
                <Col md={6}><Form.Group className="mb-3"><Form.Label>Slug</Form.Label><Form.Control value={post.slug} onChange={(e) => setPost({ ...post, slug: slugify(e.target.value) })} /></Form.Group></Col>
                <Col md={3}><Form.Group className="mb-3"><Form.Label>Category</Form.Label><Form.Select value={post.category} onChange={(e) => setPost({ ...post, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Form.Select></Form.Group></Col>
                <Col md={3}><Form.Group className="mb-3"><Form.Label>Cover</Form.Label><Form.Select value={post.tile} onChange={(e) => setPost({ ...post, tile: e.target.value })}>{TILES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</Form.Select></Form.Group></Col>
              </Row>
              <Form.Group className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <Form.Label className="mb-0">Excerpt</Form.Label>
                  <Button size="sm" variant="outline-secondary" onClick={aiExcerpt} disabled={!!aiBusy}>
                    {aiBusy === 'excerpt' ? <Spinner size="sm" /> : <><IconifyIcon icon="solar:magic-stick-3-bold" className="me-1" />AI</>}
                  </Button>
                </div>
                <Form.Control as="textarea" rows={2} value={post.excerpt} onChange={(e) => setPost({ ...post, excerpt: e.target.value })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <Form.Label className="mb-0">Body (HTML)</Form.Label>
                  <Button size="sm" variant="outline-secondary" onClick={aiDraft} disabled={!!aiBusy}>
                    {aiBusy === 'draft' ? <Spinner size="sm" /> : <><IconifyIcon icon="solar:magic-stick-3-bold" className="me-1" />Write draft with AI</>}
                  </Button>
                </div>
                <Form.Control as="textarea" rows={9} value={post.body} onChange={(e) => setPost({ ...post, body: e.target.value })} placeholder="<p>Your story…</p>" style={{ fontFamily: 'var(--bs-font-monospace, monospace)', fontSize: '0.85rem' }} />
              </Form.Group>
              <Form.Group className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <Form.Label className="mb-0">Tags / hashtags</Form.Label>
                  <Button size="sm" variant="outline-secondary" onClick={aiHashtags} disabled={!!aiBusy}>
                    {aiBusy === 'tags' ? <Spinner size="sm" /> : <><IconifyIcon icon="solar:hashtag-bold" className="me-1" />Suggest</>}
                  </Button>
                </div>
                <Form.Control value={post.tags} onChange={(e) => setPost({ ...post, tags: e.target.value })} placeholder="#WearYourHeritage, Adire, indigo, Lagos fashion" />
              </Form.Group>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={post.status} onChange={(e) => setPost({ ...post, status: e.target.value })}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="published">Published (live on site)</option>
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setPost(null)}>Cancel</Button>
          <Button variant="primary" onClick={savePost} disabled={busy}>{busy ? <Spinner size="sm" /> : 'Save post'}</Button>
        </Modal.Footer>
      </Modal>

      {/* ---- testimonial editor ---- */}
      <Modal show={!!testi} onHide={() => setTesti(null)}>
        <Modal.Header closeButton><Modal.Title>{testi?.id ? 'Edit testimonial' : 'New testimonial'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {testi && (
            <>
              <Row className="g-2">
                <Col md={7}><Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control value={testi.name} onChange={(e) => setTesti({ ...testi, name: e.target.value })} placeholder="Funmi A." /></Form.Group></Col>
                <Col md={5}><Form.Group className="mb-3"><Form.Label>Location</Form.Label><Form.Control value={testi.location} onChange={(e) => setTesti({ ...testi, location: e.target.value })} placeholder="Lagos, Nigeria" /></Form.Group></Col>
              </Row>
              <Form.Group className="mb-3"><Form.Label>Quote</Form.Label><Form.Control as="textarea" rows={3} value={testi.quote} onChange={(e) => setTesti({ ...testi, quote: e.target.value })} /></Form.Group>
              <Row className="g-2">
                <Col xs={4}><Form.Group className="mb-3"><Form.Label>Rating</Form.Label><Form.Select value={testi.rating} onChange={(e) => setTesti({ ...testi, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}</Form.Select></Form.Group></Col>
                <Col xs={4}><Form.Group className="mb-3"><Form.Label>Avatar</Form.Label><Form.Select value={testi.tile} onChange={(e) => setTesti({ ...testi, tile: e.target.value })}>{TILES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</Form.Select></Form.Group></Col>
                <Col xs={4}><Form.Group className="mb-3"><Form.Label>Order</Form.Label><Form.Control type="number" value={testi.sort} onChange={(e) => setTesti({ ...testi, sort: Number(e.target.value) })} /></Form.Group></Col>
              </Row>
              <Form.Check type="switch" label="Featured (shown first)" checked={!!testi.featured} onChange={(e) => setTesti({ ...testi, featured: e.target.checked ? 1 : 0 })} className="mb-2" />
              <Form.Check type="switch" label="Published (visible on site)" checked={testi.status === 'published'} onChange={(e) => setTesti({ ...testi, status: e.target.checked ? 'published' : 'hidden' })} />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setTesti(null)}>Cancel</Button>
          <Button variant="primary" onClick={saveTesti} disabled={busy}>{busy ? <Spinner size="sm" /> : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ContentPage;
