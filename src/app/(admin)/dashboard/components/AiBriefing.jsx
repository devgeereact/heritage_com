import { useState } from 'react';
import { Card, CardBody, Button, Spinner, Alert } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';

const naira = (n) => '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG');

// The five Dashboard AI features (HeritOS spec). One ai.php call returns all
// five so we only spend tokens once per briefing. Each maps to a labelled
// section the model is told to emit verbatim, so parsing is deterministic.
const SECTIONS = [
  { key: 'BRIEFING', icon: 'solar:sun-2-bold-duotone', tone: 'primary', title: 'Daily briefing' },
  { key: 'FORECAST', icon: 'solar:graph-up-bold-duotone', tone: 'success', title: 'Sales forecast' },
  { key: 'RESTOCK', icon: 'solar:box-bold-duotone', tone: 'danger', title: 'Restock now' },
  { key: 'SLOW', icon: 'solar:hourglass-bold-duotone', tone: 'warning', title: 'Slow movers' },
  { key: 'TREND', icon: 'solar:fire-bold-duotone', tone: 'info', title: 'Trend signal' },
];

// Compact, plain-English digest of the live numbers for the model. Keeping it
// terse keeps the prompt cheap and the response focused.
function buildPrompt(a) {
  const k = a.kpis || {};
  const days = (a.sales_by_day || []).slice(-7)
    .map((d) => `${d.day}: ${d.orders} orders / ${naira(d.revenue)}`).join('; ');
  const chan = (a.by_channel || [])
    .map((c) => `${c.channel}: ${c.orders} orders / ${naira(c.revenue)}`).join('; ');
  const top = (a.top_products || []).slice(0, 6)
    .map((p) => `${p.name} (${p.units}u / ${naira(p.revenue)})`).join('; ');
  const low = (a.low_stock || []).slice(0, 8)
    .map((s) => `${s.product} ${s.size}/${s.color} = ${s.stock} left`).join('; ');

  return `Live figures for Herit Clothing today:
- Totals: revenue ${naira(k.revenue)} across ${k.orders} orders, ${k.units} units, ${k.customers} customers, avg order ${naira(k.avg_order)}, stock value ${naira(k.stock_value)}.
- Last 7 days: ${days || 'no recent sales'}.
- By channel: ${chan || 'n/a'}.
- Top sellers: ${top || 'n/a'}.
- Low stock: ${low || 'none flagged'}.

Write a manager's morning briefing. Be specific, use the numbers, no fluff.
Return EXACTLY these five sections, each starting with the tag on its own line and 1–2 plain sentences under it. Do not add other text:
[BRIEFING] how the brand is doing right now
[FORECAST] where this week/month looks headed and why
[RESTOCK] which exact sizes/colours to reorder before they sell out
[SLOW] which stock is sitting and should be discounted or promoted
[TREND] what is gaining interest (channel or product) worth leaning into`;
}

// Split the model's tagged response back into the five sections.
function parse(text) {
  const out = {};
  const re = /\[(BRIEFING|FORECAST|RESTOCK|SLOW|TREND)\]\s*([\s\S]*?)(?=\n?\[(?:BRIEFING|FORECAST|RESTOCK|SLOW|TREND)\]|$)/g;
  let m;
  while ((m = re.exec(text))) out[m[1]] = m[2].trim();
  return out;
}

const AiBriefing = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parts, setParts] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const a = await heritApi.analytics();
      const { text } = await heritApi.ai('dashboard_briefing', buildPrompt(a), { max_tokens: 600 });
      const p = parse(text || '');
      setParts(Object.keys(p).length ? p : { BRIEFING: (text || '').trim() });
    } catch (e) {
      setError(e.message || 'Could not generate the briefing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-1">
      <CardBody>
        <div className="d-flex align-items-center justify-content-between mb-1">
          <div className="d-flex align-items-center gap-2">
            <div className="avatar-sm bg-primary-subtle rounded d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <IconifyIcon icon="solar:magic-stick-3-bold-duotone" className="fs-20 text-primary" />
            </div>
            <div>
              <h5 className="mb-0">AI briefing</h5>
              <p className="text-muted mb-0 small">Today in plain words — forecast, restock and trend signals from your live numbers.</p>
            </div>
          </div>
          <Button size="sm" variant={parts ? 'outline-primary' : 'primary'} onClick={run} disabled={loading}>
            {loading ? <><Spinner size="sm" animation="border" className="me-1" /> Reading the numbers…</>
              : <><IconifyIcon icon="solar:refresh-bold" className="me-1" />{parts ? 'Refresh' : 'Generate'}</>}
          </Button>
        </div>

        {error && <Alert variant="warning" className="mt-2 mb-0 py-2 small">{error}</Alert>}

        {!parts && !loading && !error && (
          <p className="text-muted small mb-0 mt-2">
            Generate a one-tap morning read of the brand. Uses live sales, stock and channel data — no figures leave the server unsummarised.
          </p>
        )}

        {parts && (
          <div className="d-flex flex-column gap-2 mt-2">
            {SECTIONS.filter((s) => parts[s.key]).map((s) => (
              <div key={s.key} className="d-flex gap-2 p-2 rounded" style={{ background: 'var(--bs-light)' }}>
                <div className={`avatar-xs bg-${s.tone}-subtle rounded d-flex align-items-center justify-content-center flex-shrink-0`} style={{ width: 30, height: 30 }}>
                  <IconifyIcon icon={s.icon} className={`fs-16 text-${s.tone}`} />
                </div>
                <div className="flex-grow-1">
                  <div className={`small fw-semibold text-${s.tone}`}>{s.title}</div>
                  <div className="small text-body" style={{ whiteSpace: 'pre-wrap' }}>{parts[s.key]}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default AiBriefing;
