import { Alert, Button } from 'react-bootstrap';

/**
 * Shown when the server answers 409 {candidates}: a client with the same phone
 * or email exists. The owner picks one or confirms a new client (BR-03: never
 * merge silently).
 */
const DuplicateCandidates = ({ candidates = [], onPick, onConfirmNew, pickLabel = 'Use this client', busy }) => {
  if (!candidates.length) return null;
  return (
    <Alert variant="warning" role="alert">
      <div className="fw-semibold mb-2">
        {candidates.length === 1 ? 'A client with this phone or email already exists.' : 'Clients with this phone or email already exist.'}
      </div>
      <div className="d-flex flex-column gap-2">
        {candidates.map((c) => (
          <div key={c.id} className="d-flex justify-content-between align-items-center flex-wrap gap-2 border rounded p-2 bg-body">
            <div>
              <div className="fw-semibold">{c.name} <span className="text-muted small">{c.client_ref}</span></div>
              <div className="small text-muted">
                {[c.phone_masked, c.email].filter(Boolean).join(' · ')}
                {typeof c.job_count === 'number' ? ` · ${c.job_count} job${c.job_count === 1 ? '' : 's'}` : ''}
              </div>
            </div>
            {onPick && <Button variant="outline-secondary" disabled={busy} onClick={() => onPick(c)}>{pickLabel}</Button>}
          </div>
        ))}
      </div>
      {onConfirmNew && (
        <Button variant="link" className="px-0 mt-2 fw-semibold text-reset text-decoration-underline" disabled={busy} onClick={onConfirmNew}>
          No, this is a different person. Add as a new client
        </Button>
      )}
    </Alert>
  );
};

export default DuplicateCandidates;
