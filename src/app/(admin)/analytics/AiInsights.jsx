import { useState } from 'react';
import { Card, CardBody, Button, Spinner, Alert } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import heritApi from '@/helpers/heritApi';

const naira = (n) => '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG');

// The five Analytics AI features (HeritOS spec), returned in one ai.php call.
const SECTIONS = [
  { key: 'SUMMARY', icon: 'solar:document-text-bold-duotone', tone: 'primary', title: 'Weekly summary' },
  { key: 'TREND', icon: 'solar:graph-new-up-bold-duotone', tone: 'info', title: 'Trend spotting' },
  { key: 'GROWTH', icon: 'solar:rocket-2-bold-duotone', tone: 'success', title: 'Growth ideas' },
  { key: 'DEMAND', icon: 'solar:box-bold-duotone', tone: 'warning', title: 'Demand insight' },
  { key: 'BENCHMARK', icon: 'solar:ranking-bold-duotone', tone: 'secondary', title: 'Benchmark' },
];

function buildPrompt(a) {
  const k = a.kpis || {};
  const days = (a.sales_by_day || []).slice(-14)
    .map((d) => `${d.day}: ${d.orders}o/${naira(d.revenue)}`).join('; ');
  const chan = (a.by_channel || []).map((c) => `${c.channel}: ${c.orders}o/${naira(c.revenue)}`).join('; ');
  const top = (a.top_products || []).slice(0, 8).map((p) => `${p.name} (${p.units}u/${naira(p.revenue)})`).join('; ');
  const low = (a.low_stock || []).slice(0, 8).map((s) => `${s.product} ${s.size}/${s.color}=${s.stock}`).join('; ');

  return `Herit Clothing analytics (a Lagos heritage-fashion brand selling online and at Ajuwon Market):
- Totals: revenue ${naira(k.revenue)}, ${k.orders} orders, ${k.units} units, ${k.customers} customers, avg order ${naira(k.avg_order)}, stock value ${naira(k.stock_value)}.
- Daily (14d): ${days || 'no sales'}.
- Channels: ${chan || 'n/a'}.
- Top products: ${top || 'n/a'}.
- Low stock: ${low || 'none'}.

Act as the brand's analyst. Be concrete, cite the numbers, no fluff.
Return EXACTLY these five sections, each starting with the tag on its own line then 1–2 sentences. Add nothing else:
[SUMMARY] plain-English recap of the period's performance
[TREND] what is rising or falling — channel, product or pace — before it peaks
[GROWTH] the single highest-leverage thing to do next, and why
[DEMAND] what to make or stock more of based on what is selling and running low
[BENCHMARK] how these numbers read for a small fashion brand — healthy, thin, or worrying`;
}

function parse(text) {
  const out = {};
  const re = /\[(SUMMARY|TREND|GROWTH|DEMAND|BENCHMARK)\]\s*([\s\S]*?)(?=\n?\[(?:SUMMARY|TREND|GROWTH|DEMAND|BENCHMARK)\]|$)/g;
  let m;
  while ((m = re.exec(text))) out[m[1]] = m[2].trim();
  return out;
}

const AiInsights = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parts, setParts] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { text } = await heritApi.ai('analytics_insights', buildPrompt(data), { max_tokens: 650 });
      const p = parse(text || '');
      setParts(Object.keys(p).length ? p : { SUMMARY: (text || '').trim() });
    } catch (e) {
      setError(e.message || 'Could not generate insights.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-3">
      <CardBody>
        <div className="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <div className="avatar-sm bg-primary-subtle rounded d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
              <IconifyIcon icon="solar:magic-stick-3-bold-duotone" className="fs-20 text-primary" />
            </div>
            <div>
              <h5 className="mb-0">AI insights</h5>
              <p className="text-muted mb-0 small">Weekly read, trends, growth and demand — drawn from the numbers above.</p>
            </div>
          </div>
          <Button size="sm" variant={parts ? 'outline-primary' : 'primary'} onClick={run} disabled={loading || !data}>
            {loading ? <><Spinner size="sm" animation="border" className="me-1" /> Analysing…</>
              : <><IconifyIcon icon="solar:magic-stick-3-bold" className="me-1" />{parts ? 'Refresh' : 'Analyse'}</>}
          </Button>
        </div>

        {error && <Alert variant="warning" className="mt-2 mb-0 py-2 small">{error}</Alert>}

        {parts && (
          <div className="row g-2 mt-1">
            {SECTIONS.filter((s) => parts[s.key]).map((s) => (
              <div key={s.key} className="col-md-6">
                <div className="d-flex gap-2 p-2 rounded h-100" style={{ background: 'var(--bs-light)' }}>
                  <div className={`avatar-xs bg-${s.tone}-subtle rounded d-flex align-items-center justify-content-center flex-shrink-0`} style={{ width: 30, height: 30 }}>
                    <IconifyIcon icon={s.icon} className={`fs-16 text-${s.tone}`} />
                  </div>
                  <div className="flex-grow-1">
                    <div className={`small fw-semibold text-${s.tone}`}>{s.title}</div>
                    <div className="small text-body" style={{ whiteSpace: 'pre-wrap' }}>{parts[s.key]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default AiInsights;
