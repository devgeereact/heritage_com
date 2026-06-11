import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, Table, Badge, Button, Spinner, Alert, Form } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const MEASURE_FIELDS = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'length', 'neck'];
const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const stageVariant = (s) => (s === 'done' ? 'success' : s === 'cancelled' ? 'secondary' : 'warning');

function safeParse(v) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v) || {}; } catch { return {}; }
}

const CrmDetailPage = () => {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [profile, setProfile] = useState({ name: '', phone: '', email: '', notes: '' });
  const [m, setM] = useState({});
  const [savingP, setSavingP] = useState(false);
  const [savingM, setSavingM] = useState(false);
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try {
      const data = await heritApi.customers.get(id);
      setC(data);
      setProfile({ name: data.name || '', phone: data.phone || '', email: data.email || '', notes: data.notes || '' });
      setM(safeParse(data.measurements));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    if (!profile.name.trim()) { showNotification({ message: 'Name is required', variant: 'danger' }); return; }
    setSavingP(true);
    try {
      await heritApi.customers.update(id, profile);
      showNotification({ message: 'Profile saved', variant: 'success' });
      load();
    } catch (e) {
      showNotification({ message: e.message || 'Could not save', variant: 'danger' });
    } finally { setSavingP(false); }
  };

  const saveMeasurements = async () => {
    setSavingM(true);
    try {
      const clean = Object.fromEntries(
        Object.entries(m).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, Number(v)])
      );
      await heritApi.customers.setMeasurements(id, clean);
      showNotification({ message: 'Measurements saved', variant: 'success' });
    } catch (e) {
      showNotification({ message: e.message || 'Could not save', variant: 'danger' });
    } finally { setSavingM(false); }
  };

  if (state === 'loading') return <div className="text-center py-5"><Spinner /></div>;
  if (state === 'error') {
    return (
      <Alert variant="warning">
        Could not load this customer. The API may be offline, or they do not exist.{' '}
        <Link to="/crm">Back to customers</Link>.
      </Alert>
    );
  }

  const setP = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));
  const setMeasure = (k) => (e) => setM((x) => ({ ...x, [k]: e.target.value }));

  return (
    <>
      <PageTItle title={c.name} />

      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/crm" className="btn btn-sm btn-light"><IconifyIcon icon="solar:arrow-left-linear" /> Customers</Link>
        <h4 className="mb-0">{c.name}</h4>
      </div>

      <Row className="g-3">
        <Col lg={5}>
          <Card>
            <CardBody>
              <h5 className="card-title mb-3">Profile</h5>
              <Form.Label>Name</Form.Label>
              <Form.Control value={profile.name} onChange={setP('name')} className="mb-2" />
              <Form.Label>Phone / WhatsApp</Form.Label>
              <Form.Control value={profile.phone} onChange={setP('phone')} className="mb-2" />
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={profile.email} onChange={setP('email')} className="mb-2" />
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={profile.notes} onChange={setP('notes')} className="mb-3" />
              <Button variant="primary" onClick={saveProfile} disabled={savingP}>
                {savingP ? <Spinner size="sm" /> : 'Save profile'}
              </Button>
            </CardBody>
          </Card>

          <Card className="mt-3">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Saved measurements</h5>
                <Button size="sm" variant="primary" onClick={saveMeasurements} disabled={savingM}>
                  {savingM ? <Spinner size="sm" /> : 'Save'}
                </Button>
              </div>
              <Row className="g-2">
                {MEASURE_FIELDS.map((field) => (
                  <Col xs={6} md={4} key={field}>
                    <Form.Control type="number" step="0.5" min="0" placeholder={field}
                      value={m[field] ?? ''} onChange={setMeasure(field)} />
                    <Form.Text className="text-muted text-capitalize">{field}</Form.Text>
                  </Col>
                ))}
              </Row>
              <p className="text-muted small mt-3 mb-0">
                These are ready to reuse when starting a tailoring order for this customer.
              </p>
            </CardBody>
          </Card>
        </Col>

        <Col lg={7}>
          <Card>
            <CardBody className="p-0">
              <div className="p-3 pb-2"><h5 className="card-title mb-0">Tailoring orders</h5></div>
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr><th>Code</th><th>Garment</th><th>Fabric</th><th>Stage</th><th className="text-end">Price</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {(c.orders || []).length === 0 && (
                    <tr><td colSpan={6} className="text-center text-muted py-4">No tailoring orders yet.</td></tr>
                  )}
                  {(c.orders || []).map((o) => (
                    <tr key={o.id}>
                      <td><Link to={`/tailoring/${o.id}`} className="fw-semibold text-decoration-none">{o.code}</Link></td>
                      <td className="text-capitalize">{o.garment_type}</td>
                      <td className="small">{o.fabric || '—'}</td>
                      <td><Badge bg={stageVariant(o.stage)} className="text-capitalize">{o.stage}</Badge></td>
                      <td className="text-end">{naira(o.price)}</td>
                      <td className="small">{o.due_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default CrmDetailPage;
