import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import { ENQUIRY_LABELS, ENQUIRY_NEXT, fmtDate, fmtUtc, naira, waLink } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import PageHeader from '@/components/herit/PageHeader';
import SaveState from '@/components/herit/SaveState';
import ClientPicker from '@/components/herit/ClientPicker';
import { EnquiryChip, StageChip } from '@/components/herit/StatusChip';
import AiReplyModal from '../components/AiReplyModal';

const OWNER = ['super_admin', 'admin', 'manager'];
const TYPE = { fitting: 'Fitting', bespoke: 'Bespoke', wholesale: 'Wholesale or group', general: 'General' };

const EnquiryDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuthContext();
  const isOwner = OWNER.includes(user?.role);
  const [e, setE] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState({ owner_notes: '', next_follow_up: '', closed_reason: '' });
  const [save, setSave] = useState({ state: null, error: '' });
  const [statusSave, setStatusSave] = useState({ state: null, error: '' });
  const [allowed, setAllowed] = useState(null);
  const [linkTo, setLinkTo] = useState({});
  const [linkSave, setLinkSave] = useState({ state: null, error: '' });
  const [reply, setReply] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await heritApi.enquiries.get(id);
      setE(r);
      setNotes({ owner_notes: r.owner_notes || '', next_follow_up: r.next_follow_up || '', closed_reason: r.closed_reason || '' });
      setAllowed(null);
      setState('ready');
    } catch (err) {
      setError(err); setState(err.status === 404 ? 'missing' : 'error');
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const saveNotes = async (ev) => {
    ev.preventDefault();
    setSave({ state: 'saving', error: '' });
    try {
      await heritApi.enquiries.update(id, notes);
      setSave({ state: 'saved', error: '' });
    } catch (err) {
      setSave({ state: 'failed', error: err.message });
    }
  };

  const moveTo = async (to) => {
    setStatusSave({ state: 'saving', error: '' });
    try {
      const r = await heritApi.enquiries.update(id, { status: to, ...(to === 'closed' ? { closed_reason: notes.closed_reason } : {}) });
      setE((x) => ({ ...x, status: r.status }));
      setStatusSave({ state: 'saved', error: '' });
      setAllowed(null);
    } catch (err) {
      if (err.status === 409 && Array.isArray(err.data?.allowed)) setAllowed(err.data.allowed);
      setStatusSave({ state: 'failed', error: err.message });
    }
  };

  const link = async () => {
    if (!linkTo.id) return;
    setLinkSave({ state: 'saving', error: '' });
    try {
      await heritApi.enquiries.linkClient(id, linkTo.id);
      setLinkSave({ state: 'saved', error: '' });
      load();
    } catch (err) {
      setLinkSave({ state: 'failed', error: err.message });
    }
  };

  if (state === 'loading') return <div className="hd text-center py-5"><Spinner role="status" /></div>;
  if (state === 'missing') return <div className="hd"><p>This enquiry does not exist. <Link to="/enquiries">Back to enquiries</Link></p></div>;
  if (state === 'error') return <div className="hd"><LoadError what="this enquiry" error={error} onRetry={load} /></div>;

  const next = allowed || ENQUIRY_NEXT[e.status] || [];
  const wa = waLink(e.phone);

  return (
    <div className="hd">
      <PageTitle title={`Enquiry: ${e.name}`} />
      <PageHeader
        back={{ to: `/enquiries?status=${e.status}`, label: 'Enquiries' }}
        title={e.name}
        subtitle={<span className="d-inline-flex align-items-center gap-2 flex-wrap"><EnquiryChip status={e.status} /> {TYPE[e.type] || e.type} · received {fmtUtc(e.created_at)}</span>}
        actions={
          e.job ? (
            <Link className="btn btn-primary" to={`/jobs/${e.job.id}`}>Open job {e.job.code}</Link>
          ) : isOwner ? (
            <Link className="btn btn-primary" to={`/enquiries/${e.id}/convert`}>
              <IconifyIcon icon="solar:user-plus-bold" className="me-1" aria-hidden="true" />Convert to client and job
            </Link>
          ) : null
        }
      />

      <Row className="g-3">
        <Col xs={12} lg={7}>
          <Card className="hd-card mb-3">
            <Card.Body>
              <h2 className="h6">What they asked</h2>
              <dl className="hd-dl mb-3">
                {e.interest && <><dt>Interest</dt><dd>{e.interest}</dd></>}
                {e.quantity && <><dt>Quantity</dt><dd>{e.quantity}</dd></>}
                {e.desired_date && <><dt>Needed by</dt><dd>{fmtDate(e.desired_date)}</dd></>}
                {e.company && <><dt>Company</dt><dd>{e.company}</dd></>}
                {e.source && <><dt>Source</dt><dd>{e.source}</dd></>}
              </dl>
              {e.message ? <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{e.message}</p> : <p className="text-muted mb-0">No message.</p>}
            </Card.Body>
          </Card>

          <Card className="hd-card mb-3">
            <Card.Body>
              <h2 className="h6">Status</h2>
              <p className="text-muted small mb-2">Move it along when something happens. Quote sent and accepted are set for you when you send or accept a quote.</p>
              <div className="d-flex flex-wrap gap-2">
                {next.map((s) => (
                  <Button key={s} variant="outline-secondary" onClick={() => moveTo(s)} disabled={statusSave.state === 'saving'}>
                    {s === 'closed' ? 'Close enquiry' : `Mark as ${ENQUIRY_LABELS[s].toLowerCase()}`}
                  </Button>
                ))}
              </div>
              {allowed && <div className="small mt-2">That change is not allowed from here. The choices above are the ones the system accepts.</div>}
              <SaveState state={statusSave.state} error={statusSave.error} />
            </Card.Body>
          </Card>

          <Card className="hd-card">
            <Card.Body>
              <Form onSubmit={saveNotes}>
                <h2 className="h6">Follow-up and notes</h2>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group controlId="enq-fu">
                      <Form.Label>Follow up on</Form.Label>
                      <Form.Control type="date" value={notes.next_follow_up} onChange={(ev) => setNotes((n) => ({ ...n, next_follow_up: ev.target.value }))} />
                      <Form.Text>It shows on Today from this date.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group controlId="enq-cr">
                      <Form.Label>Reason for closing</Form.Label>
                      <Form.Control value={notes.closed_reason} maxLength={120} onChange={(ev) => setNotes((n) => ({ ...n, closed_reason: ev.target.value }))} />
                      <Form.Text>Only if you close it, for example “went elsewhere”.</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group controlId="enq-notes">
                      <Form.Label>Your notes</Form.Label>
                      <Form.Control as="textarea" rows={4} value={notes.owner_notes} onChange={(ev) => setNotes((n) => ({ ...n, owner_notes: ev.target.value }))} />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex align-items-center gap-3 mt-3">
                  <Button type="submit" variant="outline-secondary" disabled={save.state === 'saving'}>Save notes</Button>
                  <SaveState state={save.state} error={save.error} />
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} lg={5}>
          <Card className="hd-card mb-3">
            <Card.Body>
              <h2 className="h6">Contact</h2>
              {e.phone && <div className="mb-1"><a href={`tel:${e.phone}`}>{e.phone}</a></div>}
              {e.email && <div className="mb-2"><a href={`mailto:${e.email}`}>{e.email}</a></div>}
              <div className="d-flex gap-2 flex-wrap">
                {wa && <a className="btn btn-outline-secondary" href={wa} target="_blank" rel="noopener noreferrer"><IconifyIcon icon="mdi:whatsapp" className="me-1" aria-hidden="true" />WhatsApp</a>}
                <Button variant="outline-secondary" onClick={() => setReply(true)}><IconifyIcon icon="solar:pen-new-square-bold" className="me-1" aria-hidden="true" />Draft a reply</Button>
              </div>
            </Card.Body>
          </Card>

          <Card className="hd-card mb-3">
            <Card.Body>
              <h2 className="h6">Client</h2>
              {e.client ? (
                <p className="mb-0"><Link to={`/clients/${e.client.id}`}>{e.client.name}</Link> <span className="text-muted small">{e.client.client_ref}</span></p>
              ) : e.job ? null : (
                <>
                  {e.candidates?.length > 0 && (
                    <div className="mb-3">
                      <div className="small fw-semibold mb-1">Possible matches by phone or email</div>
                      {e.candidates.map((c) => (
                        <div key={c.id} className="d-flex justify-content-between align-items-center gap-2 border rounded p-2 mb-1">
                          <span><Link to={`/clients/${c.id}`}>{c.name}</Link> <span className="small text-muted">{c.client_ref} · {c.job_count} jobs</span></span>
                          <Button variant="outline-secondary" onClick={() => setLinkTo(c)}>Choose</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <ClientPicker value={linkTo} onChange={setLinkTo} idPrefix="enq-link" allowNew={false} />
                  <div className="d-flex align-items-center gap-3 mt-2">
                    <Button variant="outline-secondary" disabled={!linkTo.id || linkSave.state === 'saving'} onClick={link}>Link this client</Button>
                    <SaveState state={linkSave.state} error={linkSave.error} />
                  </div>
                </>
              )}
            </Card.Body>
          </Card>

          {e.job && (
            <Card className="hd-card mb-3">
              <Card.Body>
                <h2 className="h6">Job</h2>
                <Link to={`/jobs/${e.job.id}`} className="fw-semibold">{e.job.code}</Link>{' '}
                <StageChip stage={e.job.job_stage} />
                {e.job.due_date && <div className="small text-muted mt-1">Promised {fmtDate(e.job.due_date)}</div>}
              </Card.Body>
            </Card>
          )}

          {isOwner && e.quotes?.length > 0 && (
            <Card className="hd-card">
              <Card.Body>
                <h2 className="h6">Quotes</h2>
                {e.quotes.map((q) => (
                  <div key={q.id} className="d-flex justify-content-between small py-1">
                    <span>Q-{q.series_id}-v{q.version} · {q.status}</span>
                    <span className="money">{naira(q.total)}</span>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <AiReplyModal enquiry={reply ? e : null} show={reply} onHide={() => setReply(false)} />
    </div>
  );
};

export default EnquiryDetailPage;
