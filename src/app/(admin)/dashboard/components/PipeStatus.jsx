import { useEffect, useState } from 'react';
import { Card, CardBody, Col, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';

/**
 * System status — a quick, honest read on whether the live backend is up.
 * Pings stats.php (a real endpoint over the live tables); green when the
 * React → PHP → MySQL pipe is answering, with a couple of headline counts.
 */
const PipeStatus = () => {
  const [status, setStatus] = useState('checking'); // checking | online | offline
  const [stats, setStats] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);

  useEffect(() => {
    let alive = true;
    heritApi.stats()
      .then((s) => { if (alive) { setStats(s); setStatus('online'); setCheckedAt(new Date()); } })
      .catch(() => { if (alive) { setStatus('offline'); setCheckedAt(new Date()); } });
    return () => { alive = false; };
  }, []);

  const rows = [
    { icon: 'solar:server-2-bold', label: 'API service', ok: status === 'online' },
    { icon: 'solar:database-bold', label: 'Database', ok: status === 'online' },
  ];

  return (
    <Col xl={4}>
      <Card className="h-100">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">System status</h5>
            {status === 'checking' && <Spinner size="sm" />}
            {status === 'online' && <Badge bg="success" className="bg-opacity-75"><IconifyIcon icon="solar:check-circle-bold" className="me-1" />Operational</Badge>}
            {status === 'offline' && <Badge bg="danger" className="bg-opacity-75">Offline</Badge>}
          </div>

          <ul className="list-unstyled mb-3">
            {rows.map((r) => (
              <li key={r.label} className="d-flex align-items-center justify-content-between py-1">
                <span className="d-flex align-items-center gap-2">
                  <IconifyIcon icon={r.icon} className="text-muted" /> {r.label}
                </span>
                {status === 'checking'
                  ? <Spinner size="sm" />
                  : <span className={r.ok ? 'text-success' : 'text-danger'}>
                      <IconifyIcon icon={r.ok ? 'solar:check-circle-bold' : 'solar:close-circle-bold'} /> {r.ok ? 'Live' : 'Down'}
                    </span>}
              </li>
            ))}
          </ul>

          {status === 'online' && stats && (
            <div className="d-flex gap-3 flex-wrap pt-2 border-top">
              <div><div className="fw-bold fs-5 mb-0">{stats?.tailoring?.active ?? 0}</div><small className="text-muted">Active jobs</small></div>
              <div><div className="fw-bold fs-5 mb-0">{stats?.catalogue?.products ?? 0}</div><small className="text-muted">Products</small></div>
              <div><div className="fw-bold fs-5 mb-0">{stats?.enquiries?.new ?? stats?.enquiries?.total ?? 0}</div><small className="text-muted">Enquiries</small></div>
            </div>
          )}

          {status === 'offline' && (
            <p className="text-muted small mb-0">
              The live API isn&apos;t answering. Check that the <code>php-api/</code> files and
              <code>config.php</code> are on the server. See <code>php-api/README.md</code>.
            </p>
          )}

          <div className="mt-3 d-flex justify-content-between align-items-center">
            <Link to="/analytics" className="small">Open analytics →</Link>
            {checkedAt && <small className="text-muted">Checked {checkedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>}
          </div>
        </CardBody>
      </Card>
    </Col>
  );
};

export default PipeStatus;
