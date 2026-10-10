import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Table, Spinner, Alert, Badge, Dropdown, Button } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';
import AiReplyModal from './components/AiReplyModal';

const STATUSES = ['new', 'contacted', 'closed'];
const statusVariant = (s) => (s === 'new' ? 'primary' : s === 'contacted' ? 'warning' : 'secondary');
const typeLabel = { fitting: 'Fitting', bespoke: 'Bespoke', wholesale: 'Wholesale', general: 'General' };

const EnquiriesPage = () => {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | offline
  const [reply, setReply] = useState(null); // enquiry being replied to
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try {
      const list = await heritApi.contact.list();
      setRows(Array.isArray(list) ? list : []);
      setState('ready');
    } catch (e) {
      // Technical detail stays in the console; the owner sees a plain message.
      console.error('Enquiries failed to load:', e);
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await heritApi.contact.setStatus(id, status);
    } catch (e) {
      showNotification({ message: e.message || 'Could not update', variant: 'danger' });
      load();
    }
  };

  const newCount = rows.filter((r) => r.status === 'new').length;

  return (
    <>
      <PageTitle title="Enquiries" />

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Enquiries</h4>
          <p className="text-muted mb-0">
            {state === 'ready'
              ? `${rows.length} total${newCount ? ` · ${newCount} new` : ''}`
              : 'Messages from the website'}
          </p>
        </div>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}

      {state === 'offline' && (
        <Alert variant="warning" className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>We could not load enquiries just now. Please try again in a moment.</span>
          <Button size="sm" variant="outline-dark" onClick={() => { setState('loading'); load(); }}>
            Retry
          </Button>
        </Alert>
      )}

      {state === 'ready' && (
        <Card>
          <CardBody className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Received</th><th>Name</th><th>Contact</th><th>Type</th>
                  <th>Interest</th><th>Message</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No enquiries yet.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="small text-nowrap">{r.created_at}</td>
                    <td>
                      <div className="fw-semibold">{r.name}</div>
                      {r.company && <div className="small text-muted">{r.company}</div>}
                    </td>
                    <td className="small">
                      {r.phone && <div><IconifyIcon icon="solar:phone-bold" /> {r.phone}</div>}
                      {r.email && <div><IconifyIcon icon="solar:letter-bold" /> {r.email}</div>}
                    </td>
                    <td><Badge bg="light" text="dark">{typeLabel[r.type] || r.type}</Badge></td>
                    <td className="small">{r.interest || '—'}</td>
                    <td className="small" style={{ maxWidth: 280 }}>{r.message || '—'}</td>
                    <td>
                      <Dropdown>
                        <Dropdown.Toggle size="sm" variant={statusVariant(r.status)} className="text-capitalize">
                          {r.status}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {STATUSES.map((s) => (
                            <Dropdown.Item key={s} active={s === r.status} className="text-capitalize" onClick={() => setStatus(r.id, s)}>
                              {s}
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                    <td>
                      <Button size="sm" variant="outline-primary" onClick={() => setReply(r)}>
                        <IconifyIcon icon="solar:magic-stick-3-bold" /> Reply
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <AiReplyModal enquiry={reply} show={!!reply} onHide={() => setReply(null)} />
    </>
  );
};

export default EnquiriesPage;
