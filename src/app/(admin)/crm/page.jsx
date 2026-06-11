import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge, Modal, Form } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const CrmPage = () => {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | offline
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try {
      const list = await heritApi.customers.list();
      setRows(Array.isArray(list) ? list : []);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showNotification({ message: 'Name is required', variant: 'danger' }); return; }
    setSaving(true);
    try {
      await heritApi.customers.create(form);
      showNotification({ message: 'Customer added', variant: 'success' });
      setShowNew(false);
      setForm({ name: '', phone: '', email: '', notes: '' });
      load();
    } catch (err) {
      showNotification({ message: err.message || 'Could not add customer', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageTItle title="Customers" />

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Customers</h4>
          <p className="text-muted mb-0">
            {state === 'ready' ? `${rows.length} customer${rows.length === 1 ? '' : 's'}` : 'Profiles, measurements and order history'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <IconifyIcon icon="solar:add-circle-bold" className="me-1" /> New customer
        </Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}

      {state === 'offline' && (
        <Alert variant="warning">
          <strong>Customers offline.</strong> Upload <code>php-api/customers.php</code> + <code>config.php</code>
          and import the <code>customers</code> table from <code>schema.sql</code>, then refresh.
        </Alert>
      )}

      {state === 'ready' && (
        <Card>
          <CardBody className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Name</th><th>Phone</th><th>Email</th>
                  <th className="text-center">Orders</th><th className="text-center">Active</th>
                  <th className="text-end">Ordered value</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted py-4">No customers yet.</td></tr>
                )}
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/crm/${c.id}`} className="fw-semibold text-decoration-none">{c.name}</Link></td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td className="text-center">{c.order_count}</td>
                    <td className="text-center">
                      {Number(c.active_orders) > 0 ? <Badge bg="primary">{c.active_orders}</Badge> : '—'}
                    </td>
                    <td className="text-end">{naira(c.ordered_value)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <Modal show={showNew} onHide={() => setShowNew(false)} centered>
        <Form onSubmit={create}>
          <Modal.Header closeButton><Modal.Title>New customer</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Label>Name *</Form.Label>
            <Form.Control value={form.name} onChange={set('name')} placeholder="Customer name" className="mb-2" />
            <Form.Label>Phone</Form.Label>
            <Form.Control value={form.phone} onChange={set('phone')} placeholder="+234..." className="mb-2" />
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={form.email} onChange={set('email')} className="mb-2" />
            <Form.Label>Notes</Form.Label>
            <Form.Control as="textarea" rows={2} value={form.notes} onChange={set('notes')} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowNew(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? <Spinner size="sm" /> : 'Add customer'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default CrmPage;
