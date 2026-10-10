import { useEffect, useState } from 'react';
import { Button, Form, ListGroup, Spinner } from 'react-bootstrap';
import heritApi from '@/helpers/heritApi';

/**
 * Pick an existing client by name, phone, client ref, company or email, or
 * type a new one. value: {id, name, client_ref} for an existing client, or
 * {name, phone, email} for a new one (id empty).
 */
const ClientPicker = ({ value, onChange, idPrefix = 'cp', errors = {}, allowNew = true }) => {
  const [mode, setMode] = useState(value?.id ? 'existing' : 'search');
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== 'search' || q.trim().length < 2) { setResults([]); return undefined; }
    let live = true;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const list = await heritApi.customers.list(q.trim());
        if (live) setResults(Array.isArray(list) ? list.slice(0, 8) : []);
      } catch {
        if (live) setResults([]);
      } finally {
        if (live) setBusy(false);
      }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q, mode]);

  if (mode === 'existing' && value?.id) {
    return (
      <div className="d-flex justify-content-between align-items-center border rounded p-2 gap-2">
        <div>
          <div className="fw-semibold">{value.name}</div>
          <div className="small text-muted">{[value.client_ref, value.phone].filter(Boolean).join(' · ')}</div>
        </div>
        <Button variant="outline-secondary" onClick={() => { onChange({}); setMode('search'); }}>Change</Button>
      </div>
    );
  }

  if (mode === 'new') {
    const set = (k) => (e) => onChange({ ...value, id: undefined, [k]: e.target.value });
    return (
      <div className="d-flex flex-column gap-3">
        <Form.Group controlId={`${idPrefix}-name`}>
          <Form.Label>Client name <span aria-hidden="true">*</span></Form.Label>
          <Form.Control value={value?.name || ''} onChange={set('name')} isInvalid={!!errors.name} autoComplete="off" required />
          <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
        </Form.Group>
        <Form.Group controlId={`${idPrefix}-phone`}>
          <Form.Label>Phone or WhatsApp</Form.Label>
          <Form.Control type="tel" inputMode="tel" value={value?.phone || ''} onChange={set('phone')} autoComplete="off" />
          <Form.Text>We check this against existing clients before saving.</Form.Text>
        </Form.Group>
        <Form.Group controlId={`${idPrefix}-email`}>
          <Form.Label>Email</Form.Label>
          <Form.Control type="email" value={value?.email || ''} onChange={set('email')} autoComplete="off" isInvalid={!!errors.email} />
          <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
        </Form.Group>
        <div><Button variant="link" className="px-0" onClick={() => { onChange({}); setMode('search'); }}>Search existing clients instead</Button></div>
      </div>
    );
  }

  return (
    <div>
      <Form.Group controlId={`${idPrefix}-search`}>
        <Form.Label>Find the client</Form.Label>
        <Form.Control type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" isInvalid={!!errors.client} />
        <Form.Text>Name, phone, client ID (CL-…), company or email.</Form.Text>
        <Form.Control.Feedback type="invalid">{errors.client}</Form.Control.Feedback>
      </Form.Group>
      {busy && <div className="py-2"><Spinner size="sm" /> <span className="visually-hidden">Searching</span></div>}
      {results.length > 0 && (
        <ListGroup className="mt-2">
          {results.map((c) => (
            <ListGroup.Item key={c.id} action onClick={() => { onChange({ id: c.id, name: c.name, client_ref: c.client_ref, phone: c.phone }); setMode('existing'); }}>
              <div className="fw-semibold">{c.name}</div>
              <div className="small text-muted">{[c.client_ref, c.phone, c.company_name].filter(Boolean).join(' · ')}</div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
      {q.trim().length >= 2 && !busy && results.length === 0 && <div className="small text-muted mt-2">No client matches “{q.trim()}”.</div>}
      {allowNew && (
        <Button variant="outline-secondary" className="mt-2" onClick={() => { onChange({ name: q.trim() }); setMode('new'); }}>
          New client
        </Button>
      )}
    </div>
  );
};

export default ClientPicker;
