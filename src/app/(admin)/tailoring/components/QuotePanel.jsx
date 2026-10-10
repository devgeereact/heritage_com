import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import heritApi from '@/helpers/heritApi';
import { newRequestKey } from '@/helpers/requestKey';
import { CHANNEL_LABELS, fmtDate, fmtUtc, naira } from '@/helpers/format';
import ErrorSummary from '@/components/herit/ErrorSummary';
import SaveState from '@/components/herit/SaveState';
import StatusChip from '@/components/herit/StatusChip';

const CHANNELS = ['whatsapp', 'in_person', 'email', 'phone'];
const Q_TONE = { draft: 'neutral', sent: 'warn', accepted: 'ok', superseded: 'neutral', declined: 'bad', expired: 'bad', withdrawn: 'neutral' };
const Q_LABEL = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', superseded: 'Replaced', declined: 'Declined', expired: 'Expired', withdrawn: 'Withdrawn' };
const num = (s) => Number(String(s ?? '').replace(/,/g, '')) || 0;
const blankItem = () => ({ description: '', qty: '1', unit_price: '' });
const toForm = (q) => ({
  items: (q?.items?.length ? q.items : [blankItem()]).map((i) => ({ description: i.description, qty: String(Number(i.qty)), unit_price: i.unit_price ? String(Number(i.unit_price)) : '' })),
  delivery_charge: q?.delivery_charge && num(q.delivery_charge) ? String(Number(q.delivery_charge)) : '',
  discount: q?.discount && num(q.discount) ? String(Number(q.discount)) : '',
  deposit_required: q?.deposit_required ? String(Number(q.deposit_required)) : '',
  fabric_responsibility: q?.fabric_responsibility || '', fitting_allowance: q?.fitting_allowance || '',
  terms: q?.terms || '', exclusions: q?.exclusions || '', valid_until: q?.valid_until || '', promised_date: q?.promised_date || '',
});

/** Versioned quotes for a job: draft, send, revise, accept, decline, withdraw (owner). */
const QuotePanel = ({ job, onChanged }) => {
  const list = job.quotes || [];
  const [selId, setSelId] = useState(list[0]?.id || null);
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(toForm(null));
  const [creating, setCreating] = useState(list.length === 0);
  const [createKey, setCreateKey] = useState(newRequestKey);
  const [save, setSave] = useState({ state: null, error: '' });
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [acceptNote, setAcceptNote] = useState('');
  const [closeNote, setCloseNote] = useState('');

  const loadQuote = useCallback(async (id) => {
    if (!id) { setQ(null); return; }
    setLoading(true);
    try { const r = await heritApi.quotes.get(id); setQ(r); setForm(toForm(r)); setCreating(false); }
    catch (e) { setMessage(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { setSelId(job.quotes?.[0]?.id || null); }, [job.quotes]);
  useEffect(() => { loadQuote(selId); }, [selId, loadQuote]);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setItem = (i, k) => (e) => setForm((f) => ({ ...f, items: f.items.map((it, n) => (n === i ? { ...it, [k]: e.target.value } : it)) }));
  const subtotal = form.items.reduce((s, it) => s + num(it.qty) * num(it.unit_price), 0);
  const total = subtotal + num(form.delivery_charge) - num(form.discount);

  const run = async (fn, okMsg) => {
    setSave({ state: 'saving', error: '' }); setMessage('');
    try { const r = await fn(); setSave({ state: 'saved', error: okMsg || '' }); return r; }
    catch (e) { setSave({ state: 'failed', error: e.message }); setMessage(e.message); return null; }
  };

  const saveDraft = async (e) => {
    e?.preventDefault();
    const body = { ...form, items: form.items.filter((it) => it.description.trim() || it.unit_price) };
    if (creating) {
      const r = await run(() => heritApi.quotes.create({ ...body, job_id: job.id, request_key: createKey }));
      if (r) { setCreateKey(newRequestKey()); onChanged?.(); setSelId(r.id); setCreating(false); }
    } else {
      const r = await run(() => heritApi.quotes.save(q.id, body));
      if (r) { setQ((x) => ({ ...x, ...r })); onChanged?.(); }
    }
  };
  const send = async () => { if (await run(() => heritApi.quotes.send(q.id, channel))) { onChanged?.(); loadQuote(q.id); } };
  const revise = async () => {
    const r = await run(() => heritApi.quotes.revise(q.id, newRequestKey()));
    if (r) { onChanged?.(); setSelId(r.id); }
  };
  const accept = async () => { if (await run(() => heritApi.quotes.accept(q.id, { channel, note: acceptNote, content_hash: q.content_hash }))) { onChanged?.(); loadQuote(q.id); } };
  const decline = async () => { if (await run(() => heritApi.quotes.decline(q.id, closeNote))) { onChanged?.(); loadQuote(q.id); } };
  const withdraw = async () => { if (await run(() => heritApi.quotes.withdraw(q.id, closeNote))) { onChanged?.(); loadQuote(q.id); } };

  const editing = creating || q?.status === 'draft';

  return (
    <>
      {list.length > 0 && (
        <div className="d-flex gap-2 flex-wrap mb-3">
          {list.map((x) => (
            <Button key={x.id} variant="outline-secondary" className={x.id === selId && !creating ? 'active' : ''} onClick={() => { setCreating(false); setSelId(x.id); }}>
              {x.number} · {Q_LABEL[x.status] || x.status}
            </Button>
          ))}
        </div>
      )}

      {loading && !q && <Spinner role="status" />}
      <ErrorSummary message={message} />

      {q && !creating && (
        <Card className="hd-card mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
              <h2 className="h6 mb-0">{q.number}</h2>
              <StatusChip tone={q.is_expired ? 'bad' : Q_TONE[q.status]}>{q.is_expired ? 'Expired' : Q_LABEL[q.status]}</StatusChip>
            </div>
            <p className="small text-muted mb-2">
              {q.sent_at ? `Sent ${fmtUtc(q.sent_at)} by ${CHANNEL_LABELS[q.sent_channel] || q.sent_channel}. ` : ''}
              {q.accepted_at ? `Accepted ${fmtUtc(q.accepted_at)} (${CHANNEL_LABELS[q.accepted_channel] || q.accepted_channel}). ` : ''}
              {q.valid_until ? `Valid until ${fmtDate(q.valid_until)}.` : ''}
            </p>
            {!editing && (
              <Table size="sm" className="mb-2">
                <thead><tr><th>Item</th><th className="text-end">Qty</th><th className="text-end">Price</th><th className="text-end">Total</th></tr></thead>
                <tbody>
                  {q.items.map((it) => (
                    <tr key={it.id}><td>{it.description}</td><td className="text-end tnum">{Number(it.qty)}</td><td className="text-end money">{naira(it.unit_price)}</td><td className="text-end money">{naira(it.line_total)}</td></tr>
                  ))}
                </tbody>
              </Table>
            )}
            {!editing && (
              <dl className="hd-dl ms-auto" style={{ maxWidth: 320 }}>
                {num(q.delivery_charge) > 0 && <><dt>Delivery</dt><dd>{naira(q.delivery_charge)}</dd></>}
                {num(q.discount) > 0 && <><dt>Discount</dt><dd>−{naira(q.discount)}</dd></>}
                <dt>Total</dt><dd>{naira(q.total)}</dd>
                {q.deposit_required && <><dt>Deposit</dt><dd>{naira(q.deposit_required)}</dd></>}
                {q.promised_date && <><dt>Promised</dt><dd>{fmtDate(q.promised_date)}</dd></>}
              </dl>
            )}

            {q.status === 'sent' && !q.is_expired && (
              <div className="border-top pt-3 mt-2">
                <h3 className="h6">The client accepted?</h3>
                <Row className="g-2">
                  <Col xs={12} md={4}>
                    <Form.Group controlId="qa-channel"><Form.Label>How they accepted</Form.Label>
                      <Form.Select value={channel} onChange={(e) => setChannel(e.target.value)}>{[...CHANNELS, 'portal'].map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}</Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Group controlId="qa-note"><Form.Label>Note</Form.Label><Form.Control value={acceptNote} onChange={(e) => setAcceptNote(e.target.value)} maxLength={255} /><Form.Text>For example: accepted on WhatsApp at 3pm.</Form.Text></Form.Group>
                  </Col>
                </Row>
                <div className="d-flex gap-2 flex-wrap mt-2">
                  <Button variant="primary" onClick={accept} disabled={save.state === 'saving'}>Record acceptance</Button>
                  <Button variant="outline-secondary" onClick={revise}>Revise (new version)</Button>
                </div>
                <p className="small text-muted mt-2 mb-0">Accepting sets the job price{q.promised_date ? ' and promised date' : ''} and confirms the job.</p>
              </div>
            )}
            {q.status === 'sent' && q.is_expired && <Alert variant="warning" className="mt-2">This quote has expired. Revise it and send the new version.</Alert>}

            <div className="d-flex gap-2 flex-wrap mt-3">
              <Link className="btn btn-outline-secondary" to={`/print/quote/${job.id}?ref=${q.id}`}>Print quote</Link>
              {['accepted', 'superseded', 'declined', 'withdrawn', 'expired'].includes(q.status) && <Button variant="outline-secondary" onClick={revise}>Revise (new version)</Button>}
            </div>

            {['draft', 'sent'].includes(q.status) && (
              <details className="mt-3">
                <summary className="small">Decline or withdraw this quote</summary>
                <Form.Group controlId="q-close" className="mt-2"><Form.Label>Note</Form.Label><Form.Control value={closeNote} onChange={(e) => setCloseNote(e.target.value)} maxLength={255} /></Form.Group>
                <div className="d-flex gap-2 mt-2">
                  {q.status === 'sent' && <Button variant="outline-danger" onClick={decline}>Client declined</Button>}
                  <Button variant="outline-secondary" onClick={withdraw}>Withdraw</Button>
                </div>
              </details>
            )}

            {q.versions?.length > 1 && (
              <div className="mt-3">
                <h3 className="h6">Versions</h3>
                {q.versions.map((v) => (
                  <div key={v.id} className="d-flex justify-content-between small py-1 border-top">
                    <button type="button" className="btn btn-link p-0 small" onClick={() => setSelId(v.id)}>{v.number}</button>
                    <span>{Q_LABEL[v.status] || v.status} · <span className="money">{naira(v.total)}</span></span>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {editing && (creating || q) && (
        <Card className="hd-card">
          <Card.Body>
            <Form onSubmit={saveDraft} noValidate>
              <h2 className="h6">{creating ? 'New quote' : `Edit draft ${q?.number || ''}`}</h2>
              {form.items.map((it, i) => (
                <Row key={i} className="g-2 mb-2 align-items-end">
                  <Col xs={12} md={6}>
                    <Form.Group controlId={`qi-d-${i}`}><Form.Label>Item {i + 1}</Form.Label><Form.Control value={it.description} onChange={setItem(i, 'description')} maxLength={255} /></Form.Group>
                  </Col>
                  <Col xs={4} md={2}>
                    <Form.Group controlId={`qi-q-${i}`}><Form.Label>Qty</Form.Label><Form.Control inputMode="decimal" value={it.qty} onChange={setItem(i, 'qty')} /></Form.Group>
                  </Col>
                  <Col xs={8} md={3}>
                    <Form.Group controlId={`qi-p-${i}`}><Form.Label>Unit price (₦)</Form.Label><Form.Control inputMode="decimal" value={it.unit_price} onChange={setItem(i, 'unit_price')} /></Form.Group>
                  </Col>
                  <Col xs={12} md={1}>
                    {form.items.length > 1 && <Button variant="outline-secondary" aria-label={`Remove item ${i + 1}`} onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, n) => n !== i) }))}>✕</Button>}
                  </Col>
                </Row>
              ))}
              <Button variant="link" className="px-0 mb-3" onClick={() => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }))}>Add another item</Button>
              <Row className="g-3">
                <Col xs={6} md={4}><Form.Group controlId="q-del"><Form.Label>Delivery (₦)</Form.Label><Form.Control inputMode="decimal" value={form.delivery_charge} onChange={setF('delivery_charge')} /></Form.Group></Col>
                <Col xs={6} md={4}><Form.Group controlId="q-disc"><Form.Label>Discount (₦)</Form.Label><Form.Control inputMode="decimal" value={form.discount} onChange={setF('discount')} /></Form.Group></Col>
                <Col xs={12} md={4}><Form.Group controlId="q-dep"><Form.Label>Deposit asked (₦)</Form.Label><Form.Control inputMode="decimal" value={form.deposit_required} onChange={setF('deposit_required')} /><Form.Text>Leave empty if none.</Form.Text></Form.Group></Col>
                <Col xs={12} md={4}><Form.Group controlId="q-prom"><Form.Label>Promised date</Form.Label><Form.Control type="date" value={form.promised_date} onChange={setF('promised_date')} /></Form.Group></Col>
                <Col xs={12} md={4}><Form.Group controlId="q-valid"><Form.Label>Valid until</Form.Label><Form.Control type="date" value={form.valid_until} onChange={setF('valid_until')} /><Form.Text>Empty uses your default from Settings.</Form.Text></Form.Group></Col>
                <Col xs={12} md={4}>
                  <Form.Group controlId="q-fab"><Form.Label>Fabric from</Form.Label>
                    <Form.Select value={form.fabric_responsibility} onChange={setF('fabric_responsibility')}>
                      <option value="">Not stated</option><option value="client">The client</option><option value="herit">Herit</option><option value="mixed">Both</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12}><Form.Group controlId="q-fit"><Form.Label>Fittings included</Form.Label><Form.Control value={form.fitting_allowance} onChange={setF('fitting_allowance')} maxLength={255} /></Form.Group></Col>
                <Col xs={12}><Form.Group controlId="q-terms"><Form.Label>Terms</Form.Label><Form.Control as="textarea" rows={3} value={form.terms} onChange={setF('terms')} /><Form.Text>Empty uses your default terms from Settings, if any.</Form.Text></Form.Group></Col>
                <Col xs={12}><Form.Group controlId="q-excl"><Form.Label>Not included</Form.Label><Form.Control as="textarea" rows={2} value={form.exclusions} onChange={setF('exclusions')} /></Form.Group></Col>
              </Row>
              <dl className="hd-dl my-3" style={{ maxWidth: 320 }}>
                <dt>Subtotal</dt><dd>{naira(subtotal)}</dd>
                <dt>Total</dt><dd>{naira(total)}</dd>
              </dl>
              <p className="small text-muted">Totals are checked again by the system when you save.</p>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Button type="submit" variant={creating ? 'primary' : 'outline-secondary'} disabled={save.state === 'saving'}>{creating ? 'Save draft' : 'Save changes'}</Button>
                {creating && list.length > 0 && <Button variant="link" onClick={() => { setCreating(false); loadQuote(selId); }}>Cancel</Button>}
                <SaveState state={save.state} error={save.error} />
              </div>
            </Form>
            {!creating && q?.status === 'draft' && (
              <div className="border-top pt-3 mt-3">
                <h3 className="h6">Send to the client</h3>
                <Row className="g-2 align-items-end">
                  <Col xs={12} md={5}>
                    <Form.Group controlId="qs-channel"><Form.Label>Sent by</Form.Label>
                      <Form.Select value={channel} onChange={(e) => setChannel(e.target.value)}>{CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}</Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={7} className="d-flex gap-2 flex-wrap">
                    <Button variant="primary" onClick={send} disabled={save.state === 'saving'}>Mark as sent</Button>
                    <Link className="btn btn-outline-secondary" to={`/print/quote/${job.id}?ref=${q.id}`}>Preview</Link>
                  </Col>
                </Row>
                <p className="small text-muted mt-2 mb-0">Sending freezes this version. Changes after that need a new version.</p>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {!creating && list.length > 0 && !list.some((x) => x.status === 'draft') && !['sent'].includes(q?.status) && q?.status !== 'accepted' && (
        <Button variant="outline-secondary" className="mt-3" onClick={() => { setCreating(true); setForm(toForm(null)); }}>Start a new quote</Button>
      )}
    </>
  );
};

export default QuotePanel;
