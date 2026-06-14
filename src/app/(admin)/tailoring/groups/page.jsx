import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, Button, Spinner, Alert, Badge, Modal, Form, Row, Col, Table } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { useNotificationContext } from '@/context/useNotificationContext';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const GARMENTS = ['agbada', 'kaftan', 'senator', 'suit', 'shirt', 'trouser', 'other'];
const emptyMember = () => ({ name: '', phone: '', garment_type: 'agbada', fabric: '', price: '' });

const NewGroupModal = ({ show, onHide, onCreated }) => {
  const [g, setG] = useState({ organiser: '', phone: '', event: '', due_date: '', discount_pct: '', notes: '' });
  const [members, setMembers] = useState([emptyMember(), emptyMember()]);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotificationContext();

  useEffect(() => { if (show) { setG({ organiser: '', phone: '', event: '', due_date: '', discount_pct: '', notes: '' }); setMembers([emptyMember(), emptyMember()]); } }, [show]);

  const setGF = (k) => (e) => setG((o) => ({ ...o, [k]: e.target.value }));
  const setM = (i, k) => (e) => setMembers((arr) => arr.map((m, j) => (j === i ? { ...m, [k]: e.target.value } : m)));
  const addRow = () => setMembers((a) => [...a, emptyMember()]);
  const delRow = (i) => setMembers((a) => a.filter((_, j) => j !== i));

  const filled = members.filter((m) => m.name.trim());
  const gross = filled.reduce((a, m) => a + (Number(m.price) || 0), 0);
  const disc = (Number(g.discount_pct) || 0) / 100;
  const net = gross * (1 - disc);

  const submit = async () => {
    if (!g.organiser.trim()) { showNotification({ message: 'Organiser name required', variant: 'danger' }); return; }
    if (filled.length === 0) { showNotification({ message: 'Add at least one member', variant: 'danger' }); return; }
    setSaving(true);
    try {
      const res = await heritApi.tailoring.groupCreate({
        ...g, discount_pct: Number(g.discount_pct) || 0,
        members: filled.map((m) => ({ ...m, price: Number(m.price) || 0 })),
      });
      showNotification({ message: `Created ${res.code} with ${res.members} pieces`, variant: 'success' });
      onCreated(); onHide();
    } catch (e) { showNotification({ message: e.message || 'Could not create group', variant: 'danger' }); }
    finally { setSaving(false); }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton><Modal.Title>New aso-ebi group</Modal.Title></Modal.Header>
      <Modal.Body>
        <Row className="g-2 mb-3">
          <Col md={4}><Form.Label className="small mb-1">Organiser *</Form.Label><Form.Control value={g.organiser} onChange={setGF('organiser')} /></Col>
          <Col md={3}><Form.Label className="small mb-1">Phone</Form.Label><Form.Control value={g.phone} onChange={setGF('phone')} /></Col>
          <Col md={5}><Form.Label className="small mb-1">Event</Form.Label><Form.Control value={g.event} onChange={setGF('event')} placeholder="Wedding, burial, birthday…" /></Col>
          <Col md={3}><Form.Label className="small mb-1">Due date</Form.Label><Form.Control type="date" value={g.due_date} onChange={setGF('due_date')} /></Col>
          <Col md={3}><Form.Label className="small mb-1">Group discount (%)</Form.Label><Form.Control type="number" min="0" max="100" value={g.discount_pct} onChange={setGF('discount_pct')} /></Col>
          <Col md={6}><Form.Label className="small mb-1">Notes</Form.Label><Form.Control value={g.notes} onChange={setGF('notes')} /></Col>
        </Row>

        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Members</h6>
          <Button size="sm" variant="light" onClick={addRow}><IconifyIcon icon="solar:add-circle-bold" /> Add member</Button>
        </div>
        <Table responsive size="sm" className="align-middle">
          <thead className="table-light"><tr><th>Name</th><th>Phone</th><th>Garment</th><th>Fabric</th><th style={{ width: 120 }}>Price (₦)</th><th /></tr></thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={i}>
                <td><Form.Control size="sm" value={m.name} onChange={setM(i, 'name')} /></td>
                <td><Form.Control size="sm" value={m.phone} onChange={setM(i, 'phone')} /></td>
                <td><Form.Select size="sm" value={m.garment_type} onChange={setM(i, 'garment_type')} className="text-capitalize">{GARMENTS.map((x) => <option key={x} value={x}>{x}</option>)}</Form.Select></td>
                <td><Form.Control size="sm" value={m.fabric} onChange={setM(i, 'fabric')} /></td>
                <td><Form.Control size="sm" type="number" min="0" value={m.price} onChange={setM(i, 'price')} /></td>
                <td>{members.length > 1 && <Button size="sm" variant="link" className="text-danger p-0" onClick={() => delRow(i)}><IconifyIcon icon="solar:trash-bin-trash-linear" /></Button>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="text-end small">
          <span className="text-muted">Gross {naira(gross)}{disc > 0 ? ` · less ${g.discount_pct}%` : ''} → </span>
          <strong>{naira(net)}</strong> across {filled.length} piece{filled.length === 1 ? '' : 's'}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Create group'}</Button>
      </Modal.Footer>
    </Modal>
  );
};

const GroupCard = ({ g }) => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const toggle = async () => {
    setOpen((o) => !o);
    if (!detail) { try { setDetail(await heritApi.tailoring.groupGet(g.id)); } catch { /* ignore */ } }
  };
  return (
    <Card className="mb-2">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2" role="button" onClick={toggle}>
          <div>
            <span className="fw-semibold">{g.code}</span> · {g.organiser_name}
            {g.event && <span className="text-muted"> · {g.event}</span>}
            <div className="text-muted small">{g.members} pieces · {naira(g.total)}{Number(g.discount_pct) > 0 ? ` · ${g.discount_pct}% group rate` : ''}{g.due_date ? ` · due ${g.due_date}` : ''}</div>
          </div>
          <IconifyIcon icon={open ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} />
        </div>
        {open && detail && (
          <Table responsive size="sm" className="mt-3 mb-0 align-middle">
            <thead className="table-light"><tr><th>Piece</th><th>Member</th><th>Garment</th><th>Stage</th><th className="text-end">Price</th></tr></thead>
            <tbody>
              {(detail.members || []).map((m) => (
                <tr key={m.id}>
                  <td><Link to={`/tailoring/${m.id}`}>{m.code}</Link></td>
                  <td>{m.customer_name}</td>
                  <td className="text-capitalize">{m.garment_type}</td>
                  <td><Badge bg={m.stage === 'done' ? 'success' : 'warning'} className="bg-opacity-75 text-capitalize">{m.stage}</Badge></td>
                  <td className="text-end">{naira(m.price)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
};

const GroupsPage = () => {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [show, setShow] = useState(false);
  const load = useCallback(async () => {
    try { setRows(await heritApi.tailoring.groupList()); setState('ready'); } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageTItle title="Aso-ebi groups" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <Link to="/tailoring" className="btn btn-sm btn-light mb-1"><IconifyIcon icon="solar:arrow-left-linear" /> Board</Link>
          <h4 className="mb-1">Aso-ebi &amp; group orders</h4>
          <p className="text-muted mb-0">One organiser, many matching pieces, group pricing.</p>
        </div>
        <Button variant="primary" onClick={() => setShow(true)}><IconifyIcon icon="solar:users-group-rounded-bold" className="me-1" /> New group</Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && <Alert variant="warning"><strong>Offline.</strong> Upload <code>tailoring.php</code> + import <code>schema_phase13.sql</code>.</Alert>}
      {state === 'ready' && (rows.length === 0
        ? <p className="text-muted">No groups yet. Create one for the next wedding or owambe.</p>
        : rows.map((g) => <GroupCard key={g.id} g={g} />))}

      <NewGroupModal show={show} onHide={() => setShow(false)} onCreated={load} />
    </>
  );
};

export default GroupsPage;
