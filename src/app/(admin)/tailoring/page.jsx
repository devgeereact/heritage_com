import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Spinner, Alert, Dropdown, Badge, Form, Card as BCard } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import AiPanel from '@/components/AiPanel';
import { useNotificationContext } from '@/context/useNotificationContext';
import NewOrderModal from './components/NewOrderModal';
import './tailoring.css';

const PRODUCTION_AI = {
  title: 'AI workshop planner',
  subtitle: 'Fabric needs, a build schedule, true cost and realistic lead times for the bench.',
  task: 'production_ai',
  cta: 'Plan the bench',
  sections: [
    { key: 'FABRIC', icon: 'solar:scissors-square-bold-duotone', tone: 'primary', title: 'Fabric estimate' },
    { key: 'SCHEDULE', icon: 'solar:calendar-bold-duotone', tone: 'info', title: 'Production schedule' },
    { key: 'COST', icon: 'solar:tag-price-bold-duotone', tone: 'warning', title: 'Cost check' },
    { key: 'LEADTIME', icon: 'solar:clock-circle-bold-duotone', tone: 'success', title: 'Lead-time predictor' },
  ],
  load: () => heritApi.tailoring.list(),
  buildPrompt: (list) => {
    const rows = (Array.isArray(list) ? list : []).filter((o) => o.stage !== 'cancelled').slice(0, 30)
      .map((o) => `${o.code} ${o.garment_type} in ${o.fabric || '—'} [${o.stage}] for ${o.customer_name}${o.due_date ? ', due ' + o.due_date : ''}, ₦${Math.round(o.price || 0).toLocaleString()}`).join('; ');
    return `Herit Clothing bespoke workshop (Lagos, agbada/kaftan/senator/etc in heritage fabrics). Active jobs: ${rows || 'none'}.

Act as the workshop manager. Reference real job codes. Return EXACTLY these four sections, each starting with the tag on its own line then 1–2 sentences:
[FABRIC] rough fabric/metres needed across the current jobs by garment type
[SCHEDULE] the order to work the bench by due date and stage
[COST] where pricing vs likely cost (fabric + labour) looks tight
[LEADTIME] realistic completion dates to promise customers`;
  },
};

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

const Card = ({ o, onStage, tailors, onAssign }) => {
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
        <Dropdown>
          <Dropdown.Toggle as="span" role="button" className={`tl-meta ${o.tailor_name ? '' : 'text-warning'}`} style={{ cursor: 'pointer' }}>
            <IconifyIcon icon="solar:user-bold" /> {o.tailor_name || 'Assign tailor'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item active={!o.assigned_tailor_id} onClick={() => onAssign(o.id, { assigned_tailor_id: '', due_date: o.due_date || '' })}>
              Unassigned
            </Dropdown.Item>
            <Dropdown.Divider />
            {(tailors || []).map((t) => (
              <Dropdown.Item key={t.id} active={Number(o.assigned_tailor_id) === Number(t.id)}
                onClick={() => onAssign(o.id, { assigned_tailor_id: t.id, due_date: o.due_date || '' })}>
                {t.name}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        <span className="tl-meta"><IconifyIcon icon="solar:tag-price-bold" /> {naira(o.price)}</span>
        {Number(o.price || 0) - Number(o.deposit || 0) > 0 && (
          <span className="tl-meta tl-overdue" title="balance due">
            <IconifyIcon icon="solar:wallet-money-bold" /> {naira(Number(o.price || 0) - Number(o.deposit || 0))}
          </span>
        )}
      </div>
      <div className="d-flex align-items-center gap-2 mt-2">
        <IconifyIcon icon="solar:calendar-bold" className={overdue ? 'text-danger' : 'text-muted'} />
        <Form.Control
          type="date" size="sm" value={o.due_date || ''}
          className={overdue ? 'border-danger text-danger' : ''}
          onChange={(e) => onAssign(o.id, { assigned_tailor_id: o.assigned_tailor_id || '', due_date: e.target.value })}
        />
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

  const onAssign = async (id, data) => {
    setOrders((prev) => prev.map((o) => (o.id === id
      ? { ...o, assigned_tailor_id: data.assigned_tailor_id || null, due_date: data.due_date || null,
          tailor_name: data.assigned_tailor_id ? (tailors.find((t) => Number(t.id) === Number(data.assigned_tailor_id))?.name || o.tailor_name) : null }
      : o)));
    try {
      await heritApi.tailoring.assign(id, data);
    } catch (e) {
      showNotification({ message: e.message || 'Could not update assignment', variant: 'danger' });
      load();
    }
  };

  const active = orders.filter((o) => o.stage !== 'cancelled');
  const onFloor = active.filter((o) => o.stage !== 'done');
  const isOverdue = (o) => o.due_date && o.stage !== 'done' && new Date(o.due_date) < new Date();
  const workload = [
    ...tailors.map((t) => {
      const jobs = onFloor.filter((o) => Number(o.assigned_tailor_id) === Number(t.id));
      return { id: t.id, name: t.name, count: jobs.length, overdue: jobs.filter(isOverdue).length };
    }),
    {
      id: 'none', name: 'Unassigned',
      count: onFloor.filter((o) => !o.assigned_tailor_id).length,
      overdue: onFloor.filter((o) => !o.assigned_tailor_id && isOverdue(o)).length,
    },
  ].filter((w) => w.count > 0 || w.id !== 'none');

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

      {state === 'ready' && workload.length > 0 && (
        <BCard className="mb-3">
          <BCard.Body className="py-2">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <span className="text-muted small text-uppercase fw-semibold me-1">
                <IconifyIcon icon="solar:users-group-rounded-bold" className="me-1" />Bench workload
              </span>
              {workload.map((w) => (
                <div key={w.id} className="d-flex align-items-center gap-1">
                  <span className={w.id === 'none' ? 'text-warning' : ''}>{w.name}</span>
                  <Badge bg={w.count === 0 ? 'light' : 'primary'} text={w.count === 0 ? 'dark' : undefined}>{w.count}</Badge>
                  {w.overdue > 0 && <Badge bg="danger" title="overdue">{w.overdue} late</Badge>}
                </div>
              ))}
            </div>
          </BCard.Body>
        </BCard>
      )}

      {state === 'ready' && active.length > 0 && <AiPanel {...PRODUCTION_AI} />}

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
                  {col.map((o) => <Card key={o.id} o={o} onStage={onStage} tailors={tailors} onAssign={onAssign} />)}
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
