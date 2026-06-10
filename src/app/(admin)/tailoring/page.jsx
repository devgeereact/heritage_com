import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Spinner, Alert, Dropdown, Badge } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';
import NewOrderModal from './components/NewOrderModal';
import './tailoring.css';

const STAGES = [
  { key: 'measure', label: 'Measure', icon: 'solar:ruler-bold' },
  { key: 'cut', label: 'Cut', icon: 'solar:scissors-bold' },
  { key: 'sew', label: 'Sew', icon: 'solar:magic-stick-3-bold' },
  { key: 'finish', label: 'Finish', icon: 'solar:iron-bold' },
  { key: 'fitting', label: 'Fitting', icon: 'solar:user-check-bold' },
  { key: 'done', label: 'Done', icon: 'solar:check-circle-bold' },
];
const STAGE_KEYS = STAGES.map((s) => s.key);
const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const Card = ({ o, onStage }) => {
  const idx = STAGE_KEYS.indexOf(o.stage);
  const next = idx >= 0 && idx < STAGE_KEYS.length - 1 ? STAGE_KEYS[idx + 1] : null;
  const overdue = o.due_date && o.stage !== 'done' && new Date(o.due_date) < new Date();
  return (
    <div className="tl-card">
      <div className="d-flex justify-content-between align-items-start">
        <Link to={`/tailoring/${o.id}`} className="tl-code text-decoration-none">{o.code}</Link>
        <span className="tl-garment text-capitalize">{o.garment_type}</span>
      </div>
      <div className="tl-customer">{o.customer_name}</div>
      {o.fabric && <div className="tl-fabric">{o.fabric}</div>}
      <div className="d-flex flex-wrap gap-2 mt-2">
        {o.tailor_name && (
          <span className="tl-meta"><IconifyIcon icon="solar:user-bold" /> {o.tailor_name}</span>
        )}
        {o.due_date && (
          <span className={`tl-meta ${overdue ? 'tl-overdue' : ''}`}>
            <IconifyIcon icon="solar:calendar-bold" /> {o.due_date}
          </span>
        )}
        <span className="tl-meta"><IconifyIcon icon="solar:tag-price-bold" /> {naira(o.price)}</span>
      </div>
      <div className="d-flex gap-2 mt-3">
        {next && (
          <Button size="sm" variant="primary" className="flex-fill" onClick={() => onStage(o.id, next)}>
            <IconifyIcon icon="solar:arrow-right-linear" /> {STAGES.find((s) => s.key === next).label}
          </Button>
        )}
        <Dropdown>
          <Dropdown.Toggle size="sm" variant="light" className="tl-dd" />
          <Dropdown.Menu>
            {STAGES.map((s) => (
              <Dropdown.Item key={s.key} active={s.key === o.stage} onClick={() => onStage(o.id, s.key)}>
                {s.label}
              </Dropdown.Item>
            ))}
            <Dropdown.Divider />
            <Dropdown.Item className="text-danger" onClick={() => onStage(o.id, 'cancelled')}>
              Cancel order
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );
};

const TailoringPage = () => {
  const [orders, setOrders] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | offline
  const [showNew, setShowNew] = useState(false);
  const { showNotification } = useNotificationContext();

  const load = useCallback(async () => {
    try {
      const [list, tlrs] = await Promise.all([
        heritApi.tailoring.list(),
        heritApi.tailoring.tailors().catch(() => []),
      ]);
      setOrders(Array.isArray(list) ? list : []);
      setTailors(Array.isArray(tlrs) ? tlrs : []);
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onStage = async (id, stage) => {
    // optimistic
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, stage } : o)));
    try {
      await heritApi.tailoring.setStage(id, stage);
    } catch (e) {
      showNotification({ message: e.message || 'Could not update stage', variant: 'danger' });
      load();
    }
  };

  const active = orders.filter((o) => o.stage !== 'cancelled');

  return (
    <>
      <PageTItle title="Tailoring & Production" />

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Tailoring &amp; Production</h4>
          <p className="text-muted mb-0">
            {state === 'ready'
              ? `${active.length} active job${active.length === 1 ? '' : 's'} on the floor`
              : 'Bespoke menswear, cut to measure'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <IconifyIcon icon="solar:add-circle-bold" className="me-1" /> New order
        </Button>
      </div>

      {state === 'loading' && (
        <div className="text-center py-5"><Spinner /></div>
      )}

      {state === 'offline' && (
        <Alert variant="warning">
          <strong>Workshop data offline.</strong> The <code>tailoring.php</code> endpoint and the
          tailoring tables aren't reachable yet. Upload <code>php-api/</code> + <code>config.php</code>
          to the server and import <code>schema.sql</code>, then refresh.
        </Alert>
      )}

      {state === 'ready' && (
        <div className="tl-board">
          {STAGES.map((s) => {
            const col = active.filter((o) => o.stage === s.key);
            return (
              <div className="tl-col" key={s.key}>
                <div className="tl-col-head">
                  <span><IconifyIcon icon={s.icon} className="me-1" />{s.label}</span>
                  <Badge bg="light" text="dark">{col.length}</Badge>
                </div>
                <div className="tl-col-body">
                  {col.length === 0 && <div className="tl-empty">—</div>}
                  {col.map((o) => <Card key={o.id} o={o} onStage={onStage} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewOrderModal
        show={showNew}
        onHide={() => setShowNew(false)}
        tailors={tailors}
        onCreated={load}
      />
    </>
  );
};

export default TailoringPage;
