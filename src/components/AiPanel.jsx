import { useState } from 'react';
import { Card, CardBody, Button, Spinner, Alert } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';

/**
 * Reusable AI insights card. Every HeritOS module surfaces its AI layer through
 * one of these: a button that pulls the module's live data, sends a single
 * ai.php call, and renders the model's reply split into fixed, labelled
 * sections. Keeps every AI feature on the same server-side proxy and the same
 * deterministic tagged-section contract.
 *
 * Props:
 *   title, subtitle         header text
 *   task                    ai.php task label (for the audit log)
 *   sections                [{ key, icon, tone, title }]  — key matches a [KEY] tag
 *   load                    async () => data   (fetch the module's live data)
 *   buildPrompt             (data) => string   (must instruct the model to emit
 *                           each section as a line starting with [KEY])
 *   maxTokens               default 650
 *   layout                  'grid' (2-col, default) | 'list'
 *   cta                     button label, default 'Generate'
 */
const AiPanel = ({ title = 'AI insights', subtitle, task, sections, load, buildPrompt, maxTokens = 650, layout = 'grid', cta = 'Generate' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parts, setParts] = useState(null);

  const keys = sections.map((s) => s.key).join('|');
  const parse = (text) => {
    const out = {};
    const re = new RegExp(`\\[(${keys})\\]\\s*([\\s\\S]*?)(?=\\n?\\[(?:${keys})\\]|$)`, 'g');
    let m;
    while ((m = re.exec(text))) out[m[1]] = m[2].trim();
    return out;
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await load();
      const { text } = await heritApi.ai(task, buildPrompt(data), { max_tokens: maxTokens });
      const p = parse(text || '');
      setParts(Object.keys(p).length ? p : { [sections[0].key]: (text || '').trim() });
    } catch (e) {
      const msg = /failed to fetch/i.test(e.message || '') ? 'Could not reach the AI service.' : (e.message || 'Could not generate insights.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const Section = ({ s }) => (
    <div className="d-flex gap-2 p-2 rounded h-100" style={{ background: 'var(--bs-light)' }}>
      <div className={`avatar-xs bg-${s.tone}-subtle rounded d-flex align-items-center justify-content-center flex-shrink-0`} style={{ width: 30, height: 30 }}>
        <IconifyIcon icon={s.icon} className={`fs-16 text-${s.tone}`} />
      </div>
      <div className="flex-grow-1">
        <div className={`small fw-semibold text-${s.tone}`}>{s.title}</div>
        <div className="small text-body" style={{ whiteSpace: 'pre-wrap' }}>{parts[s.key]}</div>
      </div>
    </div>
  );

  return (
    <Card className="mb-3">
      <CardBody>
        <div className="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="avatar-sm bg-primary-subtle rounded d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <IconifyIcon icon="solar:magic-stick-3-bold-duotone" className="fs-20 text-primary" />
            </div>
            <div>
              <h5 className="mb-0">{title}</h5>
              {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
            </div>
          </div>
          <Button size="sm" variant={parts ? 'outline-primary' : 'primary'} onClick={run} disabled={loading}>
            {loading ? <><Spinner size="sm" animation="border" className="me-1" /> Thinking…</>
              : <><IconifyIcon icon="solar:magic-stick-3-bold" className="me-1" />{parts ? 'Refresh' : cta}</>}
          </Button>
        </div>

        {error && <Alert variant="warning" className="mt-2 mb-0 py-2 small">{error}</Alert>}

        {!parts && !loading && !error && subtitle && (
          <p className="text-muted small mb-0 mt-2">One tap reads your live data and turns it into clear, specific guidance. Nothing leaves the server unsummarised.</p>
        )}

        {parts && (
          layout === 'grid' ? (
            <div className="row g-2 mt-1">
              {sections.filter((s) => parts[s.key]).map((s) => (
                <div key={s.key} className="col-md-6"><Section s={s} /></div>
              ))}
            </div>
          ) : (
            <div className="d-flex flex-column gap-2 mt-2">
              {sections.filter((s) => parts[s.key]).map((s) => <Section key={s.key} s={s} />)}
            </div>
          )
        )}
      </CardBody>
    </Card>
  );
};

export default AiPanel;
