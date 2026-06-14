import { useEffect, useState } from 'react';
import { Card, CardBody, Row, Col, Form, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import { ROLE_LABELS } from '@/helpers/roles';

const ProfilePage = () => {
  const [me, setMe] = useState(null);
  const [state, setState] = useState('loading');

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // { variant, text }
  const setField = (k) => (e) => setPw((p) => ({ ...p, [k]: e.target.value }));

  const [pin, setPin] = useState('');
  const [pinMsg, setPinMsg] = useState(null);
  const [sessions, setSessions] = useState([]);

  const loadSessions = () => { heritApi.sessions().then(setSessions).catch(() => setSessions([])); };

  useEffect(() => {
    heritApi.account.me()
      .then((u) => { setMe(u); setState('ready'); })
      .catch(() => setState('offline'));
    loadSessions();
  }, []);

  const savePin = async () => {
    setPinMsg(null);
    try {
      const r = await heritApi.setPin(pin);
      setPin('');
      setPinMsg({ variant: 'success', text: r.pin_set ? 'PIN set — you can now unlock with it on the stall device.' : 'PIN cleared.' });
    } catch (e) { setPinMsg({ variant: 'danger', text: e.message || 'Could not set PIN.' }); }
  };
  const revoke = async (id) => {
    try { await heritApi.revokeSession(id); setSessions((s) => s.filter((x) => x.id !== id)); }
    catch { loadSessions(); }
  };
  const shortDevice = (d) => {
    if (!d) return 'Unknown device';
    if (/iphone|android|mobile/i.test(d)) return 'Mobile';
    if (/mac/i.test(d)) return 'Mac';
    if (/windows/i.test(d)) return 'Windows';
    return d.slice(0, 40);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next.length < 8) { setPwMsg({ variant: 'danger', text: 'New password must be at least 8 characters.' }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ variant: 'danger', text: 'New passwords do not match.' }); return; }
    setPwBusy(true);
    try {
      await heritApi.account.changePassword(pw.current, pw.next);
      setPwMsg({ variant: 'success', text: 'Password changed. Other devices have been signed out.' });
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwMsg({ variant: 'danger', text: err.message || 'Could not change password.' });
    } finally { setPwBusy(false); }
  };

  return (
    <>
      <PageTItle title="My Profile" />
      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && (
        <Alert variant="warning"><strong>Profile offline.</strong> Upload <code>php-api/users.php</code> to the server.</Alert>
      )}

      {state === 'ready' && me && (
        <Row className="g-3">
          <Col lg={5}>
            <Card>
              <CardBody className="text-center">
                <div className="avatar-lg mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary"
                     style={{ width: 84, height: 84, fontSize: 32, fontWeight: 600 }}>
                  {me.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <h4 className="mb-1">{me.name}</h4>
                <Badge bg="primary" className="bg-opacity-75 mb-3">{ROLE_LABELS[me.role] || me.role}</Badge>
                <div className="text-start mt-2">
                  <p className="mb-2"><IconifyIcon icon="solar:letter-bold" className="me-2 text-muted" />{me.email}</p>
                  {me.phone && <p className="mb-2"><IconifyIcon icon="solar:phone-bold" className="me-2 text-muted" />{me.phone}</p>}
                  <p className="mb-0"><IconifyIcon icon="solar:calendar-bold" className="me-2 text-muted" />Joined {new Date(me.created_at).toLocaleDateString()}</p>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col lg={7}>
            <Card>
              <CardBody>
                <h5 className="mb-3">Change password</h5>
                {pwMsg && <Alert variant={pwMsg.variant} className="py-2">{pwMsg.text}</Alert>}
                <Form onSubmit={changePassword}>
                  <Form.Group className="mb-3">
                    <Form.Label>Current password</Form.Label>
                    <Form.Control type="password" value={pw.current} onChange={setField('current')} autoComplete="current-password" />
                  </Form.Group>
                  <Row className="g-2">
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>New password</Form.Label><Form.Control type="password" value={pw.next} onChange={setField('next')} autoComplete="new-password" /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Confirm new</Form.Label><Form.Control type="password" value={pw.confirm} onChange={setField('confirm')} autoComplete="new-password" /></Form.Group></Col>
                  </Row>
                  <Button variant="primary" type="submit" disabled={pwBusy || !pw.current || !pw.next}>
                    {pwBusy ? <><Spinner size="sm" /> Updating…</> : 'Update password'}
                  </Button>
                </Form>
              </CardBody>
            </Card>

            <Card className="mt-3">
              <CardBody>
                <h5 className="mb-1">Stall PIN</h5>
                <p className="text-muted small">A 4–6 digit PIN to unlock quickly on a shared market-stall device. Leave blank + save to remove it.</p>
                {pinMsg && <Alert variant={pinMsg.variant} className="py-2">{pinMsg.text}</Alert>}
                <div className="d-flex gap-2" style={{ maxWidth: 320 }}>
                  <Form.Control type="password" inputMode="numeric" maxLength={6} placeholder="PIN" value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} style={{ letterSpacing: '0.3em', textAlign: 'center' }} />
                  <Button variant="dark" onClick={savePin} disabled={pin !== '' && pin.length < 4}>Save PIN</Button>
                </div>
              </CardBody>
            </Card>

            <Card className="mt-3">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="mb-0">Active sessions</h5>
                  <Button size="sm" variant="light" onClick={loadSessions}><IconifyIcon icon="solar:refresh-linear" /></Button>
                </div>
                {sessions.length === 0 && <p className="text-muted mb-0">No other sessions.</p>}
                {sessions.map((s) => (
                  <div key={s.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="fw-semibold">{shortDevice(s.device)} {s.current && <Badge bg="success" className="bg-opacity-75">This device</Badge>}</div>
                      <div className="text-muted small">{s.ip || '—'} · last seen {s.last_seen || s.created_at}</div>
                    </div>
                    {!s.current && <Button size="sm" variant="outline-danger" onClick={() => revoke(s.id)}>Revoke</Button>}
                  </div>
                ))}
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
};

export default ProfilePage;
