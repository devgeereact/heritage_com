import { useEffect, useRef } from 'react';
import Icon from './Icon';

/**
 * Labelled form control. Label above (14px, 500), help below in muted text,
 * "(required)" written as text, inline error with an icon wired through
 * aria-invalid and aria-describedby. 16px text and 48px height so phones do
 * not zoom. `as` is 'input' (default), 'textarea' or 'select'.
 */
export const Field = ({ id, label, help, error, required, as = 'input', className = '', children, ...rest }) => {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  const Control = as;
  return (
    <div className={`hc-field ${className}`.trim()}>
      <label htmlFor={id} className="hc-field-label">
        {label}{required && <span className="hc-field-req"> (required)</span>}
      </label>
      <Control
        id={id}
        className="hc-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={required}
        {...rest}
      >
        {children}
      </Control>
      {help && <p id={helpId} className="hc-field-help">{help}</p>}
      {error && (
        <p id={errorId} className="hc-field-error"><Icon name="alert" size="1.1em" /> {error}</p>
      )}
    </div>
  );
};

/**
 * Shown after a failed submit: a linked list of problems that takes focus,
 * so keyboard and screen-reader users land on it. `errors` is [{ id, message }].
 */
export const ErrorSummary = ({ errors, title = 'Please check the form' }) => {
  const ref = useRef(null);
  useEffect(() => { if (errors?.length) ref.current?.focus(); }, [errors]);
  if (!errors?.length) return null;
  return (
    <div ref={ref} className="hc-error-summary" role="alert" tabIndex={-1}>
      <p className="hc-error-summary-title"><Icon name="alert" /> {title}</p>
      <ul>
        {errors.map((e) => (
          <li key={e.id || e.message}>{e.id ? <a href={`#${e.id}`}>{e.message}</a> : e.message}</li>
        ))}
      </ul>
    </div>
  );
};

export default Field;
