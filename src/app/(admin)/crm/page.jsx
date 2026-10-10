import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import { naira } from '@/helpers/format';
import LoadError from '@/components/herit/LoadError';
import PageHeader from '@/components/herit/PageHeader';
import StatusChip from '@/components/herit/StatusChip';
import NewCustomerModal from './components/NewCustomerModal';

const OWNER = ['super_admin', 'admin', 'manager'];

/** Clients: one record per person or company. Search by name, phone, client ID, company or email. */
const ClientsPage = () => {
  const { user } = useAuthContext();
  const isOwner = OWNER.includes(user?.role);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const list = await heritApi.customers.list(q.trim());
      setRows(Array.isArray(list) ? list : []);
      setState('ready');
    } catch (e) {
      setError(e); setState('error');
    }
  }, [q]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  return (
    <div className="hd">
      <PageTitle title="Clients" />
      <PageHeader
        title="Clients"
        subtitle={state === 'ready' ? `${rows.length} client${rows.length === 1 ? '' : 's'}${q ? ' found' : ''}` : 'People and companies you make for'}
        actions={<Button variant="primary" onClick={() => setShowNew(true)}><IconifyIcon icon="solar:user-plus-bold" className="me-1" aria-hidden="true" />Add client</Button>}
      />
      <Form.Group controlId="client-search" className="mb-3" style={{ maxWidth: 480 }}>
        <Form.Label>Search</Form.Label>
        <Form.Control type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        <Form.Text>Name, phone, client ID (CL-…), company or email.</Form.Text>
      </Form.Group>

      {state === 'loading' && <div className="text-center py-5"><Spinner role="status" /></div>}
      {state === 'error' && <LoadError what="clients" error={error} onRetry={load} />}
      {state === 'ready' && (
        <Card className="hd-card">
          {rows.length === 0 ? (
            <Card.Body className="text-muted">
              {q ? `No client matches “${q}”. Check the spelling or add a new client.` : 'No clients yet. Add your first client.'}
            </Card.Body>
          ) : rows.map((c) => (
            <Link key={c.id} to={`/clients/${c.id}`} className="hd-row">
              <span className="hd-row-main">
                <span className="hd-row-title d-block text-truncate">{c.name}{c.company_name ? ` · ${c.company_name}` : ''}</span>
                <span className="hd-row-sub d-block text-truncate">{[c.client_ref, c.phone, c.email].filter(Boolean).join(' · ')}</span>
              </span>
              {c.active_jobs > 0 && <StatusChip tone="warn" icon="solar:scissors-bold">{c.active_jobs} active</StatusChip>}
              {isOwner && Number(c.balance_due) > 0 && <span className="money small">{naira(c.balance_due)} due</span>}
              <IconifyIcon icon="solar:alt-arrow-right-linear" aria-hidden="true" className="text-muted" />
            </Link>
          ))}
        </Card>
      )}
      <NewCustomerModal show={showNew} onHide={() => setShowNew(false)} onCreated={(cid) => navigate(`/clients/${cid}`)} />
    </div>
  );
};

export default ClientsPage;
