import { Alert, Button } from 'react-bootstrap';

/**
 * Plain service-error state with Retry (UX-SPEC "Required states", K-02).
 * Technical detail stays in the console, never on screen.
 */
const LoadError = ({ what = 'this page', onRetry, error }) => {
  if (error) console.error(`Could not load ${what}:`, error);
  return (
    <Alert variant="warning" className="d-flex justify-content-between align-items-center flex-wrap gap-2" role="alert">
      <span>We could not load {what} just now. Check your connection and try again.</span>
      {onRetry && (
        <Button variant="outline-secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Alert>
  );
};

export default LoadError;
