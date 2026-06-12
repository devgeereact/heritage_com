import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardBody, Table, Button, Spinner, Alert, Badge, Row, Col } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import AiPanel from '@/components/AiPanel';
import AdjustStockModal from './components/AdjustStockModal';

const INVENTORY_AI = {
  title: 'AI stock intelligence',
  subtitle: 'Demand forecast, reorder quantities, overproduction guard and a seasonal plan from live stock.',
  task: 'inventory_ai',
  cta: 'Forecast',
  sections: [
    { key: 'FORECAST', icon: 'solar:graph-up-bold-duotone', tone: 'primary', title: 'Demand forecast (per SKU)' },
    { key: 'REORDER', icon: 'solar:box-bold-duotone', tone: 'danger', title: 'Reorder quantities' },
    { key: 'GUARD', icon: 'solar:shield-warning-bold-duotone', tone: 'warning', title: 'Overproduction guard' },
    { key: 'SEASON', icon: 'solar:calendar-bold-duotone', tone: 'info', title: 'Seasonal plan' },
  ],
  load: () => heritApi.inventory.list(),
  buildPrompt: (d) => {
    const v = (d.variants || []).slice(0, 40)
      .map((x) => `${x.product_name} ${x.size}/${x.color} (${x.fabric || '—'}): ${x.stock} left [${x.state}]`).join('; ');
    const s = d.summary || {};
    return `Herit Clothing live stock (Lagos heritage-fashion brand). Summary: ${s.skus || 0} SKUs, ${s.units || 0} units, value ₦${Math.round(s.value || 0).toLocaleString()}, ${s.low || 0} low, ${s.out || 0} out.
Variants: ${v || 'none'}.

Act as the inventory planner. Be specific, name sizes/colours, give numbers. Return EXACTLY these four sections, each starting with the tag on its own line then 1–2 sentences:
[FORECAST] which exact SKUs (size/colour) will sell fastest and likely run out
[REORDER] how much of which pieces to make or buy next, with rough quantities
[GUARD] what is overstocked or slow and should NOT be reordered
[SEASON] what to stock ahead for the season/owambe demand in Lagos`;
  },
};

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const STATE_BADGE = {
  out: { variant: 'danger', label: 'Out' },
  low: { variant: 'warning', label: 'Low' },
  ok: { variant: 'success', label: 'In stock' },
};

const SummaryCard = ({ icon, label, value, tone }) => (
  <Col md={6} xl={3}>
    <Card className="h-100">
      <CardBody className="d-flex align-items-center gap-3">
        <span className={`avatar-md d-inline-flex align-items-center justify-content-center rounded fs-3 bg-${tone}-subtle text-${tone}`}>
          <IconifyIcon icon={icon} />
        </span>
        <div>
          <h4 className="mb-0">{value}</h4>
          <p className="text-muted mb-0">{label}</p>
        </div>
      </CardBody>
    </Card>
  </Col>
);

const StockPage = () => {
  const [data, setData] = useState({ variants: [], summary: null });
  const [state, setState] = useState('loading'); // loading | ready | offline
  const [filter, setFilter] = useState('all');   // all | low | out
  const [adjust, setAdjust] = useState(null);     // variant being adjusted

  const load = useCallback(async () => {
    try {
      const res = await heritApi.inventory.list();
      setData({ variants: res.variants || [], summary: res.summary || null });
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    if (filter === 'all') return data.variants;
    return data.variants.filter((v) => v.state === filter);
  }, [data.variants, filter]);

  const s = data.summary;

  return (
    <>
      <PageTItle title="Inventory & Stock" />

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="mb-1">Inventory &amp; Stock</h4>
          <p className="text-muted mb-0">
            {state === 'ready'
              ? `${s?.skus ?? 0} variants · ${s?.units ?? 0} units on hand`
              : 'Live stock by size and colour'}
          </p>
        </div>
        <Button variant="light" onClick={load} disabled={state === 'loading'}>
          <IconifyIcon icon="solar:refresh-bold" className="me-1" /> Refresh
        </Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}

      {state === 'offline' && (
        <Alert variant="warning">
          <strong>Stock offline.</strong> Upload <code>php-api/stock.php</code> + <code>config.php</code>,
          import <code>stock_adjustments</code> from <code>schema.sql</code>, then refresh.
        </Alert>
      )}

      {state === 'ready' && (
        <>
          <AiPanel {...INVENTORY_AI} />

          <Row className="g-3 mb-3">
            <SummaryCard icon="solar:bag-smile-bold-duotone" label="Stock value" value={naira(s?.value)} tone="primary" />
            <SummaryCard icon="solar:box-bold-duotone" label="Units on hand" value={s?.units ?? 0} tone="info" />
            <SummaryCard icon="solar:danger-triangle-bold-duotone" label={`Low (≤${s?.low_threshold ?? 5})`} value={s?.low ?? 0} tone="warning" />
            <SummaryCard icon="solar:close-circle-bold-duotone" label="Out of stock" value={s?.out ?? 0} tone="danger" />
          </Row>

          <Card>
            <CardBody className="pb-0">
              <div className="d-flex gap-2 flex-wrap">
                {[
                  { k: 'all', label: `All (${data.variants.length})` },
                  { k: 'low', label: `Low (${s?.low ?? 0})` },
                  { k: 'out', label: `Out (${s?.out ?? 0})` },
                ].map((f) => (
                  <Button
                    key={f.k} size="sm"
                    variant={filter === f.k ? 'primary' : 'light'}
                    onClick={() => setFilter(f.k)}
                  >{f.label}</Button>
                ))}
              </div>
            </CardBody>
            <CardBody className="p-0 mt-2">
              <Table responsive hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Product</th><th>SKU</th><th>Size</th><th>Colour</th>
                    <th className="text-end">On hand</th><th className="text-end">Value</th>
                    <th>State</th><th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-4">No variants in this view.</td></tr>
                  )}
                  {rows.map((v) => {
                    const b = STATE_BADGE[v.state] || STATE_BADGE.ok;
                    return (
                      <tr key={v.id}>
                        <td>
                          <div className="fw-semibold">{v.product_name}</div>
                          <div className="text-muted small">{v.product_code} · {v.fabric || '—'}</div>
                        </td>
                        <td><code>{v.sku}</code></td>
                        <td>{v.size || 'OS'}</td>
                        <td>{v.color || 'Default'}</td>
                        <td className="text-end fw-bold">{v.stock}</td>
                        <td className="text-end">{naira(v.stock_value)}</td>
                        <td><Badge bg={b.variant} className="bg-opacity-75">{b.label}</Badge></td>
                        <td className="text-end">
                          <Button size="sm" variant="outline-primary" onClick={() => setAdjust(v)}>
                            <IconifyIcon icon="solar:pen-bold" className="me-1" /> Adjust
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}

      <AdjustStockModal
        variant={adjust}
        onClose={() => setAdjust(null)}
        onDone={() => { setAdjust(null); load(); }}
      />
    </>
  );
};

export default StockPage;
