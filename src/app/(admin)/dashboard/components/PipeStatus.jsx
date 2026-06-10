import { useEffect, useState } from 'react';
import { Card, CardBody, Col, Badge, Button, Form, Spinner } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';

/**
 * Smoke-test widget — proves the live pipe React → api.php → MySQL → JSON.
 * Once the PHP files and DB are on the server, this card lists the `items`
 * rows and lets you append one. Until then it shows a clear offline state.
 */
const PipeStatus = () => {
  const [status, setStatus] = useState('checking'); // checking | online | offline
  const [items, setItems] = useState([]);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const rows = await heritApi.listItems();
      setItems(Array.isArray(rows) ? rows : []);
      setStatus('online');
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      await heritApi.addItem(label.trim());
      setLabel('');
      await load();
    } catch {
      // surfaced by the offline badge on next load
    } finally {
      setSaving(false);
    }
  };

  return (
    <Col xl={4}>
      <Card>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="card-title mb-0">API pipe</h5>
            {status === 'checking' && <Spinner size="sm" />}
            {status === 'online' && <Badge bg="success">Live</Badge>}
            {status === 'offline' && <Badge bg="secondary">Offline</Badge>}
          </div>

          {status === 'offline' && (
            <p className="text-muted small mb-0">
              No response from <code>api.php</code>. Upload the <code>php-api/</code>
              files and <code>config.php</code> to the server, then import
              <code>schema.sql</code>. See <code>php-api/README.md</code>.
            </p>
          )}

          {status === 'online' && (
            <>
              <ul className="list-unstyled mb-3">
                {items.length === 0 && (
                  <li className="text-muted small">No items yet — add one below.</li>
                )}
                {items.map((it) => (
                  <li key={it.id} className="d-flex align-items-center gap-2 py-1">
                    <IconifyIcon icon="solar:check-circle-bold" className="text-primary" />
                    <span>{it.label}</span>
                  </li>
                ))}
              </ul>
              <Form onSubmit={add} className="d-flex gap-2">
                <Form.Control
                  size="sm"
                  placeholder="Add an item…"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <Button type="submit" size="sm" variant="primary" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : 'Add'}
                </Button>
              </Form>
            </>
          )}
        </CardBody>
      </Card>
    </Col>
  );
};

export default PipeStatus;
