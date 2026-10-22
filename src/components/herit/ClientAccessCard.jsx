import { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';
import InviteModal from '@/components/herit/InviteModal';
import SaveState from '@/components/herit/SaveState';

/**
 * Client portal access (owner): send a single-use access link, or sign the
 * client out of every device (for a lost phone or a link sent to the wrong person).
 */
const ClientAccessCard = ({ client }) => {
  const [show, setShow] = useState(false);
  const [save, setSave] = useState({ state: null, error: '' });

  const revoke = async () => {
    if (!window.confirm(`Sign ${client.name} out of the client portal on every device?`)) return;
    setSave({ state: 'saving', error: '' });
    try {
      const r = await heritApi.access.revoke(client.id);
      setSave({ state: 'saved', error: '' });
      window.alert(r.revoked ? `Signed out of ${r.revoked} ${r.revoked === 1 ? 'device' : 'devices'}.` : 'There were no open sessions.');
    } catch (e) { setSave({ state: 'failed', error: e.message }); }
  };

  return (
    <Card className="hd-card mb-3">
      <Card.Body>
        <h2 className="h6">Client portal access</h2>
        <p className="small text-muted">
          Clients usually sign in with their job reference and a code sent to their email.
          {client.email ? '' : ' This client has no email, so send them an access link instead.'}
        </p>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Button variant="outline-secondary" onClick={() => setShow(true)}>Send access link</Button>
          <Button variant="outline-danger" onClick={revoke}>Sign out everywhere</Button>
          <SaveState state={save.state} error={save.error} />
        </div>
      </Card.Body>
      <InviteModal show={show} onHide={() => setShow(false)} customerId={client.id} clientName={client.name} />
    </Card>
  );
};

export default ClientAccessCard;
