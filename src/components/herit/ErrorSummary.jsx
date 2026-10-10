import { Alert } from 'react-bootstrap';

/** Error summary above a form; each entry also shows inline next to its field. */
const ErrorSummary = ({ errors = {}, message }) => {
  const list = Object.values(errors).filter(Boolean);
  if (!list.length && !message) return null;
  return (
    <Alert variant="danger" role="alert" tabIndex={-1}>
      {message && <div className={list.length ? 'mb-1 fw-semibold' : ''}>{message}</div>}
      {list.length > 0 && (
        <ul className="mb-0 ps-3">
          {list.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </Alert>
  );
};

export default ErrorSummary;
