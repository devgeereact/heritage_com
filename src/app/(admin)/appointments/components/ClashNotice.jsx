import { Alert, Form } from 'react-bootstrap';
import { PROBLEM_LABELS } from './TimeChooser';

/** 409 can_override: say what clashes and ask for a reason before booking anyway. */
const ClashNotice = ({ clash, reason, onReason, idPrefix }) => {
  if (!clash) return null;
  return (
    <Alert variant="warning" className="mt-3 mb-0" role="alert">
      <div className="fw-semibold mb-1">That time is not free.</div>
      <ul className="mb-2 ps-3">
        {(clash.problems || [clash.reason]).map((p) => <li key={p}>{PROBLEM_LABELS[p] || p}</li>)}
      </ul>
      <Form.Group controlId={`${idPrefix}-override`}>
        <Form.Label>Reason to book it anyway</Form.Label>
        <Form.Control value={reason} onChange={(e) => onReason(e.target.value)} maxLength={255} />
        <Form.Text>Kept with the appointment. Or choose another time.</Form.Text>
      </Form.Group>
    </Alert>
  );
};

export default ClashNotice;
