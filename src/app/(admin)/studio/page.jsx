import { useState } from 'react';
import { Card, CardBody, Button, Spinner, Alert, Row, Col, Form } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';

// Each preset frames the AI prompt in the Herit brand voice (warm, rooted,
// confident) so staff get on-brand copy without writing the prompt themselves.
const PRESETS = [
  { key: 'caption', label: 'Instagram caption', icon: 'solar:instagram-bold', ph: 'e.g. Adire wrap dress, hand-dyed indigo, limited drop',
    frame: (i) => `Write a short, warm Instagram caption (max 4 lines, a few tasteful emojis, 4-6 hashtags) for Herit Clothing — contemporary African fashion in heritage fabrics, made in Lagos. Product/idea: ${i}` },
  { key: 'description', label: 'Product description', icon: 'solar:document-text-bold', ph: 'e.g. Two-piece set in bold Ankara, lined, true to size',
    frame: (i) => `Write a product description (2 short paragraphs) in the Herit Clothing brand voice — warm, rooted, confident; name the fabric and its story. Product: ${i}` },
  { key: 'email', label: 'Email / WhatsApp blast', icon: 'solar:letter-bold', ph: 'e.g. Founders Drop launch, 10% off first order, code HERIT10',
    frame: (i) => `Write a short marketing email + a one-line WhatsApp broadcast for Herit Clothing. Warm and on-brand, clear call to action. Campaign: ${i}` },
  { key: 'restock', label: 'Restock / sold-out note', icon: 'solar:bell-bold', ph: 'e.g. Signature Adire shirt back in stock, sizes M and L',
    frame: (i) => `Write a brief, exciting "back in stock" announcement for Herit Clothing customers. One short paragraph + a punchy line. Details: ${i}` },
];

// Visual presets frame a text-to-image prompt in the Herit aesthetic.
const IMG_PRESETS = [
  { key: 'campaign', label: 'Campaign creative', icon: 'solar:gallery-bold', ph: 'e.g. Founders Drop hero — model in Ankara two-piece, warm Lagos light',
    frame: (i) => `Editorial fashion campaign image for Herit Clothing, a contemporary African heritage-fashion brand. Rich, warm, premium, natural light, magazine quality. ${i}` },
  { key: 'pattern', label: 'Fabric pattern idea', icon: 'solar:magic-stick-3-bold', ph: 'e.g. new Adire-inspired indigo print, geometric, modern',
    frame: (i) => `A seamless textile print pattern inspired by African heritage fabrics (Ankara/Adire/Aso-Oke), flat lay, high detail, vibrant. ${i}` },
  { key: 'scene', label: 'Background scene', icon: 'solar:map-bold', ph: 'e.g. Lagos market backdrop, soft bokeh, golden hour',
    frame: (i) => `A clean, on-brand background scene for product photography, no people, warm tones, premium. ${i}` },
  { key: 'story', label: 'Brand-story visual', icon: 'solar:book-bookmark-bold', ph: 'e.g. hands weaving Aso-Oke on a traditional loom',
    frame: (i) => `A documentary-style, evocative image telling the heritage story behind Herit Clothing. Authentic, warm, Lagos/Nigeria. ${i}` },
];

const StudioPage = () => {
  const [preset, setPreset] = useState('caption');
  const [input, setInput] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  // Visual studio
  const [imgPreset, setImgPreset] = useState('campaign');
  const [imgInput, setImgInput] = useState('');
  const [img, setImg] = useState('');
  const [imgBusy, setImgBusy] = useState(false);
  const [imgErr, setImgErr] = useState('');
  const activeImg = IMG_PRESETS.find((p) => p.key === imgPreset);

  const generateImage = async () => {
    if (!imgInput.trim()) { setImgErr('Describe the image you want.'); return; }
    setImgBusy(true); setImgErr(''); setImg('');
    try {
      const res = await heritApi.aiImage(`studio_${imgPreset}`, activeImg.frame(imgInput.trim()));
      setImg(res.image || res.image_url || '');
      if (!res.image && !res.image_url) setImgErr('No image returned.');
    } catch (e) {
      setImgErr(/not configured|503|failed to fetch/i.test(e.message || '')
        ? 'Image AI isn’t switched on yet — add ai_image.php + an image provider key to config.php to enable visuals.'
        : (e.message || 'Could not generate the image.'));
    } finally { setImgBusy(false); }
  };

  const active = PRESETS.find((p) => p.key === preset);

  const generate = async () => {
    if (!input.trim()) { setErr('Tell the studio what to write about.'); return; }
    setBusy(true); setErr(''); setOut(''); setCopied(false);
    try {
      const res = await heritApi.ai('content', active.frame(input.trim()));
      // ai.php returns { text } (or { content } / { result }) — accept any.
      setOut(res.text || res.content || res.result || (typeof res === 'string' ? res : JSON.stringify(res)));
    } catch (e) { setErr(e.message || 'AI is unavailable. Check ai.php + OpenRouter key.'); }
    finally { setBusy(false); }
  };

  const copy = () => { navigator.clipboard?.writeText(out); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <>
      <PageTItle title="Content & Brand Studio" />
      <div className="mb-3"><h4 className="mb-1">Content &amp; Brand Studio</h4><p className="text-muted mb-0">On-brand copy in seconds — captions, descriptions, blasts.</p></div>

      <Row className="g-3">
        <Col lg={5}>
          <Card><CardBody>
            <Form.Label>What do you need?</Form.Label>
            <div className="d-grid gap-2 mb-3">
              {PRESETS.map((p) => (
                <button type="button" key={p.key} className={`btn text-start d-flex align-items-center gap-2 ${preset === p.key ? 'btn-primary' : 'btn-light'}`} onClick={() => { setPreset(p.key); setOut(''); }}>
                  <IconifyIcon icon={p.icon} /> {p.label}
                </button>
              ))}
            </div>
            <Form.Label>Details</Form.Label>
            <Form.Control as="textarea" rows={4} value={input} onChange={(e) => setInput(e.target.value)} placeholder={active.ph} />
            <Button variant="primary" className="w-100 mt-3" onClick={generate} disabled={busy}>
              {busy ? <><Spinner size="sm" className="me-1" /> Writing…</> : <><IconifyIcon icon="solar:magic-stick-3-bold" className="me-1" /> Generate</>}
            </Button>
          </CardBody></Card>
        </Col>

        <Col lg={7}>
          <Card className="h-100"><CardBody>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Draft</h5>
              {out && <Button size="sm" variant="light" onClick={copy}><IconifyIcon icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'} className="me-1" />{copied ? 'Copied' : 'Copy'}</Button>}
            </div>
            {err && <Alert variant="danger" className="py-2">{err}</Alert>}
            {!out && !busy && !err && <p className="text-muted">Your on-brand draft appears here. Edit before posting.</p>}
            {busy && <div className="text-center py-5"><Spinner /></div>}
            {out && <Form.Control as="textarea" rows={12} value={out} onChange={(e) => setOut(e.target.value)} style={{ fontFamily: 'var(--bs-font-sans-serif)' }} />}
          </CardBody></Card>
        </Col>
      </Row>

      {/* Visual studio — text-to-image */}
      <div className="mt-4 mb-3"><h5 className="mb-1">Visual studio <span className="badge bg-primary-subtle text-primary">beta</span></h5><p className="text-muted mb-0 small">AI imagery for campaigns, patterns and brand stories. Needs an image provider key in config.php.</p></div>
      <Row className="g-3">
        <Col lg={5}>
          <Card><CardBody>
            <Form.Label>Visual type</Form.Label>
            <div className="d-grid gap-2 mb-3">
              {IMG_PRESETS.map((p) => (
                <button type="button" key={p.key} className={`btn text-start d-flex align-items-center gap-2 ${imgPreset === p.key ? 'btn-primary' : 'btn-light'}`} onClick={() => { setImgPreset(p.key); setImg(''); }}>
                  <IconifyIcon icon={p.icon} /> {p.label}
                </button>
              ))}
            </div>
            <Form.Label>Describe it</Form.Label>
            <Form.Control as="textarea" rows={4} value={imgInput} onChange={(e) => setImgInput(e.target.value)} placeholder={activeImg.ph} />
            <Button variant="primary" className="w-100 mt-3" onClick={generateImage} disabled={imgBusy}>
              {imgBusy ? <><Spinner size="sm" className="me-1" /> Rendering…</> : <><IconifyIcon icon="solar:gallery-add-bold" className="me-1" /> Generate image</>}
            </Button>
          </CardBody></Card>
        </Col>
        <Col lg={7}>
          <Card className="h-100"><CardBody>
            <h5 className="mb-2">Image</h5>
            {imgErr && <Alert variant="warning" className="py-2">{imgErr}</Alert>}
            {!img && !imgBusy && !imgErr && <p className="text-muted">Your generated visual appears here.</p>}
            {imgBusy && <div className="text-center py-5"><Spinner /><div className="text-muted small mt-2">Rendering can take ~10-20s…</div></div>}
            {img && <>
              <img src={img} alt="AI generated" className="img-fluid rounded mb-2" style={{ width: '100%' }} />
              <a href={img} download="herit-visual.png" className="btn btn-sm btn-light"><IconifyIcon icon="solar:download-bold" className="me-1" /> Download</a>
            </>}
          </CardBody></Card>
        </Col>
      </Row>
    </>
  );
};

export default StudioPage;
