import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge, Row, Col, Modal, Form, Dropdown } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import AiPanel from '@/components/AiPanel';

const MARKETING_AI = {
  title: 'AI marketing studio',
  subtitle: 'On-brand captions, ad copy, an email angle, best posting time and audience read.',
  task: 'marketing_ai',
  cta: 'Generate ideas',
  sections: [
    { key: 'CAPTION', icon: 'solar:hashtag-bold-duotone', tone: 'primary', title: 'Caption & hashtags' },
    { key: 'ADCOPY', icon: 'solar:megaphone-bold-duotone', tone: 'danger', title: 'Ad copy to test' },
    { key: 'EMAIL', icon: 'solar:letter-bold-duotone', tone: 'info', title: 'Email / WhatsApp angle' },
    { key: 'TIMING', icon: 'solar:clock-circle-bold-duotone', tone: 'warning', title: 'Best time to post' },
    { key: 'AUDIENCE', icon: 'solar:users-group-rounded-bold-duotone', tone: 'success', title: 'Audience read' },
  ],
  load: () => heritApi.marketing.list(),
  buildPrompt: (r) => {
    const cs = (r.campaigns || []).slice(0, 15).map((c) => `${c.name} [${c.channel}/${c.status}]${c.goal ? ' — ' + c.goal : ''}`).join('; ');
    return `Herit Clothing — Lagos brand fusing African heritage fabrics (Ankara, Adire, Aso-Oke) with contemporary cuts; sells online and at Ajuwon Market. Current campaigns: ${cs || 'none yet'}.

Act as the brand's social/marketing lead. Voice: proud, warm, heritage-forward, never cheesy. Return EXACTLY these five sections, each starting with the tag on its own line then 1–2 sentences (real, postable copy where relevant):
[CAPTION] one ready-to-post Instagram caption + 3-5 hashtags for a new drop
[ADCOPY] two short ad lines to A/B test
[EMAIL] the angle + subject line for the next email/WhatsApp blast
[TIMING] when this audience is likely most active, and posting cadence
[AUDIENCE] who is buying and what resonates with them`;
  },
};

const CHANNELS = ['instagram', 'whatsapp', 'email', 'tiktok', 'facebook'];
const STATUSES = ['planned', 'live', 'paused', 'done'];
const STATUS_BADGE = { live: 'success', planned: 'info', paused: 'warning', done: 'secondary' };
const CHAN_ICON = { instagram: 'solar:instagram-bold', whatsapp: 'mdi:whatsapp', email: 'solar:letter-bold', tiktok: 'mdi:music-note', facebook: 'mdi:facebook' };

const NewCampaignModal = ({ show, onClose, onDone }) => {
  const [f, setF] = useState({ name: '', channel: 'instagram', goal: '', starts_on: '', ends_on: '', notes: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) { setErr('Campaign name is required.'); return; }
    setBusy(true); setErr('');
    try { await heritApi.marketing.create(f); setF({ name: '', channel: 'instagram', goal: '', starts_on: '', ends_on: '', notes: '' }); onDone(); }
    catch (e2) { setErr(e2.message || 'Could not save.'); setBusy(false); }
  };
  return (
    <Modal show={show} onHide={onClose} centered><Form onSubmit={submit}>
      <Modal.Header closeButton><Modal.Title className="fs-5">New campaign</Modal.Title></Modal.Header>
      <Modal.Body>
        {err && <Alert variant="danger" className="py-2">{err}</Alert>}
        <Row className="g-2">
          <Col md={7}><Form.Label>Name</Form.Label><Form.Control value={f.name} onChange={set('name')} placeholder="e.g. Founders' Drop launch" autoFocus /></Col>
          <Col md={5}><Form.Label>Channel</Form.Label><Form.Select value={f.channel} onChange={set('channel')} className="text-capitalize">{CHANNELS.map((c) => <option key={c}>{c}</option>)}</Form.Select></Col>
          <Col xs={12}><Form.Label>Goal</Form.Label><Form.Control value={f.goal} onChange={set('goal')} placeholder="e.g. 50 orders, grow IG to 5k" /></Col>
          <Col md={6}><Form.Label>Starts</Form.Label><Form.Control type="date" value={f.starts_on} onChange={set('starts_on')} /></Col>
          <Col md={6}><Form.Label>Ends</Form.Label><Form.Control type="date" value={f.ends_on} onChange={set('ends_on')} /></Col>
          <Col xs={12}><Form.Label>Notes</Form.Label><Form.Control as="textarea" rows={2} value={f.notes} onChange={set('notes')} /></Col>
        </Row>
      </Modal.Body>
      <Modal.Footer><Button variant="light" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant="primary" disabled={busy}>{busy ? <Spinner size="sm" /> : 'Create campaign'}</Button></Modal.Footer>
    </Form></Modal>
  );
};

const MarketingPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [state, setState] = useState('loading');
  const [showNew, setShowNew] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const load = useCallback(async () => {
    try { const r = await heritApi.marketing.list(); setCampaigns(r.campaigns || []); setSummary(r.summary || null); setState('ready'); }
    catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    setErrMsg('');
    try { await heritApi.marketing.setStatus(id, status); load(); }
    catch (e) { setErrMsg(e.message || 'Could not update status.'); }
  };

  return (
    <>
      <PageTitle title="Marketing & Social" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div><h4 className="mb-1">Marketing &amp; Social</h4><p className="text-muted mb-0">Plan drops, posts and campaigns. Grow the brand.</p></div>
        <Button variant="primary" onClick={() => setShowNew(true)}><IconifyIcon icon="solar:megaphone-bold" className="me-1" /> New campaign</Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && <Alert variant="warning"><strong>Marketing offline.</strong> Upload <code>php-api/marketing.php</code> and import the campaigns table from <code>schema.sql</code>.</Alert>}
      {errMsg && <Alert variant="danger" dismissible onClose={() => setErrMsg('')}>{errMsg}</Alert>}

      {state === 'ready' && (
        <>
          <AiPanel {...MARKETING_AI} />

          <Row className="g-3 mb-3">
            <Col md={4}><Card><CardBody><p className="text-muted mb-1">Total campaigns</p><h4 className="mb-0">{summary?.total ?? 0}</h4></CardBody></Card></Col>
            <Col md={4}><Card><CardBody><p className="text-muted mb-1">Live now</p><h4 className="mb-0 text-success">{summary?.live ?? 0}</h4></CardBody></Card></Col>
            <Col md={4}><Card><CardBody><p className="text-muted mb-1">Planned</p><h4 className="mb-0 text-info">{summary?.planned ?? 0}</h4></CardBody></Card></Col>
          </Row>

          <Card><CardBody className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light"><tr><th>Campaign</th><th>Channel</th><th>Window</th><th>Goal</th><th>Status</th><th className="text-end">Action</th></tr></thead>
              <tbody>
                {campaigns.length === 0 && <tr><td colSpan={6} className="text-center text-muted py-4">No campaigns yet.</td></tr>}
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.name}</td>
                    <td><IconifyIcon icon={CHAN_ICON[c.channel] || 'solar:hashtag-bold'} className="me-1" /><span className="text-capitalize">{c.channel}</span></td>
                    <td className="small text-muted">{c.starts_on || '—'} → {c.ends_on || '—'}</td>
                    <td className="small">{c.goal || '—'}</td>
                    <td><Badge bg={STATUS_BADGE[c.status]} className="bg-opacity-75 text-capitalize">{c.status}</Badge></td>
                    <td className="text-end">
                      <Dropdown align="end">
                        <Dropdown.Toggle size="sm" variant="light">Set status</Dropdown.Toggle>
                        <Dropdown.Menu>
                          {STATUSES.map((s) => <Dropdown.Item key={s} className="text-capitalize" onClick={() => setStatus(c.id, s)}>{s}</Dropdown.Item>)}
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody></Card>
        </>
      )}

      <NewCampaignModal show={showNew} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); load(); }} />
    </>
  );
};

export default MarketingPage;
