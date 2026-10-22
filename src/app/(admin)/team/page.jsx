import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge, Dropdown } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { ROLE_LABELS } from '@/helpers/roles';
import { useAuthContext } from '@/context/useAuthContext';
import NewStaffModal from './components/NewStaffModal';
import EditStaffModal from './components/EditStaffModal';

const ROLE_BADGE = {
  super_admin: 'danger', admin: 'primary', manager: 'info',
  tailor: 'success', editor: 'warning', seller: 'secondary', employee: 'dark',
};
const STATUS_BADGE = { active: 'success', invited: 'warning', suspended: 'secondary' };

// The auth cookie stores { user:{ id, ... } } plus the token unless cookie auth is on.
const currentUserId = (auth) => auth?.user?.user?.id ?? auth?.user?.id ?? null;

const TeamPage = () => {
  const auth = useAuthContext();
  const meId = currentUserId(auth);
  const [staff, setStaff] = useState([]);
  const [state, setState] = useState('loading');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(0);

  const load = useCallback(async () => {
    try {
      const rows = await heritApi.team.list();
      setStaff(Array.isArray(rows) ? rows : []);
      setState('ready');
    } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const resetPassword = async (u) => {
    if (!confirm(`Reset password for ${u.name}? Their current sessions end and you'll get a temporary password to hand over.`)) return;
    setBusyId(u.id);
    try {
      const { temp_password } = await heritApi.team.reset(u.id);
      window.prompt(`Temporary password for ${u.name} — copy it now, it won't be shown again:`, temp_password);
    } catch (e) { alert(e.message || 'Could not reset.'); }
    finally { setBusyId(0); }
  };

  const deactivate = async (u) => {
    if (!confirm(`Deactivate ${u.name}? They lose access immediately.`)) return;
    setBusyId(u.id);
    try { await heritApi.team.deactivate(u.id); await load(); }
    catch (e) { alert(e.message || 'Could not deactivate.'); }
    finally { setBusyId(0); }
  };

  const counts = staff.reduce((a, u) => { a[u.status] = (a[u.status] || 0) + 1; return a; }, {});

  return (
    <>
      <PageTitle title="Team & Access" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Team &amp; Access</h4>
          <p className="text-muted mb-0">Who can sign in to HeritOS and what they can do. Roles decide which modules each person sees.</p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <IconifyIcon icon="solar:user-plus-bold" className="me-1" /> Add staff
        </Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && (
        <Alert variant="warning"><strong>Team offline.</strong> Upload <code>php-api/users.php</code> to the server. The <code>users</code> table already exists in <code>schema.sql</code>.</Alert>
      )}

      {state === 'ready' && (
        <Card>
          <CardBody className="border-bottom d-flex gap-4 flex-wrap">
            <div><span className="text-muted">Staff</span> <strong className="ms-1">{staff.length}</strong></div>
            <div><span className="text-muted">Active</span> <strong className="ms-1">{counts.active || 0}</strong></div>
            <div><span className="text-muted">Invited</span> <strong className="ms-1">{counts.invited || 0}</strong></div>
          </CardBody>
          <CardBody className="p-0">
            <Table responsive hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th className="text-end">Actions</th></tr>
              </thead>
              <tbody>
                {staff.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No staff yet.</td></tr>}
                {staff.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-semibold">
                      {u.name}
                      {u.id === meId && <Badge bg="light" text="dark" className="ms-2">You</Badge>}
                    </td>
                    <td>{u.email}</td>
                    <td><Badge bg={ROLE_BADGE[u.role] || 'secondary'} className="bg-opacity-75">{ROLE_LABELS[u.role] || u.role}</Badge></td>
                    <td><Badge bg={STATUS_BADGE[u.status] || 'secondary'} className="bg-opacity-75 text-capitalize">{u.status}</Badge></td>
                    <td className="text-end">
                      <Dropdown align="end">
                        <Dropdown.Toggle size="sm" variant="light" disabled={busyId === u.id}>
                          {busyId === u.id ? <Spinner size="sm" /> : <IconifyIcon icon="solar:menu-dots-bold" />}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => setEditing(u)}><IconifyIcon icon="solar:pen-bold" className="me-2" />Edit</Dropdown.Item>
                          <Dropdown.Item onClick={() => resetPassword(u)}><IconifyIcon icon="solar:key-bold" className="me-2" />Reset password</Dropdown.Item>
                          {u.id !== meId && (
                            <>
                              <Dropdown.Divider />
                              <Dropdown.Item className="text-danger" onClick={() => deactivate(u)}>
                                <IconifyIcon icon="solar:trash-bin-trash-bold" className="me-2" />Deactivate
                              </Dropdown.Item>
                            </>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      <NewStaffModal show={showNew} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); load(); }} />
      <EditStaffModal staff={editing} isSelf={editing?.id === meId} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />
    </>
  );
};

export default TeamPage;
