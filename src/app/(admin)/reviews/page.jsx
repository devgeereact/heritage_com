import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Button, Spinner, Alert, Badge, Form, Nav } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const Stars = ({ n }) => (
  <span>{[1, 2, 3, 4, 5].map((i) => <IconifyIcon key={i} icon={i <= n ? 'solar:star-bold' : 'solar:star-linear'} style={{ color: '#e0a200' }} />)}</span>
);

const ReviewCard = ({ r, onStatus, onRespond, onAnswer }) => {
  const isQ = r.kind === 'question';
  const [resp, setResp] = useState((isQ ? r.answer : r.response) || '');
  return (
    <Card className="mb-3">
      <CardBody>
        <div className="d-flex justify-content-between flex-wrap gap-2">
          <div>
            <div className="d-flex align-items-center gap-2">
              {isQ ? <Badge bg="info" className="bg-opacity-75"><IconifyIcon icon="solar:question-circle-bold" /> Question</Badge> : <Stars n={Number(r.rating)} />}
              <strong>{r.author_name}</strong>
              {Number(r.verified) === 1 && <Badge bg="success" className="bg-opacity-75"><IconifyIcon icon="solar:verified-check-bold" /> Verified</Badge>}
              <Badge bg={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'} className="bg-opacity-75 text-capitalize">{r.status}</Badge>
            </div>
            <div className="text-muted small mt-1">{r.product_name || r.product_slug} · {String(r.created_at).slice(0, 10)}</div>
          </div>
          <div className="d-flex gap-2">
            {r.status !== 'approved' && <Button size="sm" variant="success" onClick={() => onStatus(r.id, 'approved')}>Approve</Button>}
            {r.status !== 'rejected' && <Button size="sm" variant="outline-danger" onClick={() => onStatus(r.id, 'rejected')}>Reject</Button>}
          </div>
        </div>
        {r.title && <div className="fw-semibold mt-2">{r.title}</div>}
        {r.body && <p className="mb-1">{r.body}</p>}
        {r.photo_url && <img src={r.photo_url} alt="" style={{ maxWidth: 140, borderRadius: 8 }} />}
        <div className="d-flex gap-2 mt-2">
          <Form.Control size="sm" placeholder={isQ ? 'Answer this question' : 'Public reply (optional)'} value={resp} onChange={(e) => setResp(e.target.value)} />
          <Button size="sm" variant={isQ ? 'primary' : 'light'} onClick={() => (isQ ? onAnswer(r.id, resp) : onRespond(r.id, resp))}>{isQ ? 'Answer' : 'Reply'}</Button>
        </div>
      </CardBody>
    </Card>
  );
};

const ReviewsPage = () => {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    setState('loading');
    try { setData(await heritApi.reviews.moderate(tab)); setState('ready'); } catch { setState('offline'); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const onStatus = async (id, status) => {
    setData((d) => ({ ...d, reviews: d.reviews.filter((x) => x.id !== id) }));
    try { await heritApi.reviews.setStatus(id, status); showNotification({ message: `Review ${status}`, variant: 'success' }); }
    catch (e) { showNotification({ message: e.message || 'Could not update', variant: 'danger' }); load(); }
  };
  const onRespond = async (id, response) => {
    try { await heritApi.reviews.respond(id, response); showNotification({ message: 'Reply saved', variant: 'success' }); }
    catch (e) { showNotification({ message: e.message || 'Could not save', variant: 'danger' }); }
  };
  const onAnswer = async (id, answer) => {
    try { await heritApi.reviews.answer(id, answer); showNotification({ message: 'Answer published', variant: 'success' }); load(); }
    catch (e) { showNotification({ message: e.message || 'Could not save', variant: 'danger' }); }
  };

  const counts = data?.counts || {};

  return (
    <>
      <PageTitle title="Reviews" />
      <div className="mb-3">
        <h4 className="mb-1">Reviews &amp; UGC</h4>
        <p className="text-muted mb-0">Moderate customer reviews and reply in the brand voice.</p>
      </div>

      <Nav variant="tabs" activeKey={tab} onSelect={(k) => setTab(k)} className="mb-3">
        {['pending', 'approved', 'rejected'].map((s) => (
          <Nav.Item key={s}>
            <Nav.Link eventKey={s} className="text-capitalize">{s} {counts[s] != null && <Badge bg="light" text="dark">{counts[s]}</Badge>}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && <Alert variant="warning"><strong>Offline.</strong> Upload <code>reviews.php</code> + import <code>schema_phase10.sql</code>.</Alert>}
      {state === 'ready' && (
        (data.reviews || []).length === 0
          ? <p className="text-muted">Nothing {tab}.</p>
          : data.reviews.map((r) => <ReviewCard key={r.id} r={r} onStatus={onStatus} onRespond={onRespond} onAnswer={onAnswer} />)
      )}
    </>
  );
};

export default ReviewsPage;
