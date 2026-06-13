import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, Table, Spinner, Alert, Row, Col, Button, Badge } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import AiInsights from './AiInsights';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const Kpi = ({ label, value, tone, icon }) => (
  <Col md={6} xl={2}>
    <Card className="h-100"><CardBody>
      <span className={`avatar-sm d-inline-flex align-items-center justify-content-center rounded fs-4 bg-${tone}-subtle text-${tone} mb-2`}><IconifyIcon icon={icon} /></span>
      <h4 className="mb-0">{value}</h4><p className="text-muted mb-0 small">{label}</p>
    </CardBody></Card>
  </Col>
);

const AnalyticsPage = () => {
  const [d, setD] = useState(null);
  const [state, setState] = useState('loading');

  const load = useCallback(async () => {
    try { setD(await heritApi.analytics()); setState('ready'); } catch { setState('offline'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const k = d?.kpis;
  const maxRev = Math.max(1, ...(d?.sales_by_day || []).map((x) => x.revenue));
  const maxChan = Math.max(1, ...(d?.by_channel || []).map((x) => x.revenue));
  const split = d?.customer_split;
  const splitTotal = Math.max(1, (split?.new?.revenue || 0) + (split?.returning?.revenue || 0));
  const maxRegion = Math.max(1, ...(d?.by_region || []).map((x) => x.revenue));
  const regionTone = { Lagos: 'primary', 'Other Nigeria': 'info', Diaspora: 'success' };

  return (
    <>
      <PageTItle title="Analytics & Reports" />
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div><h4 className="mb-1">Analytics &amp; Reports</h4><p className="text-muted mb-0">The numbers behind every decision.</p></div>
        <Button variant="light" onClick={load} disabled={state === 'loading'}><IconifyIcon icon="solar:refresh-bold" className="me-1" /> Refresh</Button>
      </div>

      {state === 'loading' && <div className="text-center py-5"><Spinner /></div>}
      {state === 'offline' && <Alert variant="warning"><strong>Analytics offline.</strong> Upload <code>php-api/analytics.php</code>. It reads the live orders / products / customers tables — no new schema.</Alert>}

      {state === 'ready' && (
        <>
          <AiInsights data={d} />

          <Row className="g-3 mb-3">
            <Kpi label="Revenue" value={naira(k?.revenue)} tone="primary" icon="solar:money-bag-bold-duotone" />
            <Kpi label="Orders" value={k?.orders ?? 0} tone="info" icon="solar:cart-large-2-bold-duotone" />
            <Kpi label="Units sold" value={k?.units ?? 0} tone="secondary" icon="solar:box-bold-duotone" />
            <Kpi label="Avg order" value={naira(k?.avg_order)} tone="success" icon="solar:tag-price-bold-duotone" />
            <Kpi label="Customers" value={k?.customers ?? 0} tone="warning" icon="solar:users-group-rounded-bold-duotone" />
            <Kpi label="Stock value" value={naira(k?.stock_value)} tone="danger" icon="solar:bag-smile-bold-duotone" />
            <Kpi label="Gross profit" value={naira(k?.profit)} tone="success" icon="solar:money-bag-bold-duotone" />
            <Kpi label="Margin" value={`${Math.round((k?.margin ?? 0) * 100)}%`} tone="primary" icon="solar:pie-chart-2-bold-duotone" />
          </Row>
          {(k?.cogs ?? 0) === 0 && (
            <p className="text-muted small mb-3"><IconifyIcon icon="solar:info-circle-linear" className="me-1" />Profit is a floor — set each product&apos;s cost price (COGS) in the catalogue to sharpen it.</p>
          )}

          <Row className="g-3">
            <Col xl={8}>
              <Card><CardBody>
                <h5 className="mb-3">Sales — last 14 days</h5>
                {(d.sales_by_day || []).length === 0 ? <p className="text-muted mb-0">No sales in this window yet.</p> : (
                  <div className="d-flex align-items-end gap-1" style={{ height: 180 }}>
                    {d.sales_by_day.map((x) => (
                      <div key={x.day} className="flex-fill d-flex flex-column align-items-center justify-content-end" title={`${x.day}: ${naira(x.revenue)} (${x.orders} orders)`}>
                        <div style={{ width: '70%', height: `${(x.revenue / maxRev) * 150}px`, background: 'var(--bs-primary)', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
                        <small className="text-muted mt-1" style={{ fontSize: 10 }}>{String(x.day).slice(5)}</small>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody></Card>
            </Col>
            <Col xl={4}>
              <Card><CardBody>
                <h5 className="mb-3">By channel</h5>
                {(d.by_channel || []).length === 0 ? <p className="text-muted mb-0">No orders yet.</p> : d.by_channel.map((c) => (
                  <div key={c.channel} className="mb-2">
                    <div className="d-flex justify-content-between small"><span className="text-capitalize">{c.channel}</span><span className="fw-semibold">{naira(c.revenue)}</span></div>
                    <div className="progress" style={{ height: 6 }}><div className="progress-bar" style={{ width: `${(c.revenue / maxChan) * 100}%` }} /></div>
                  </div>
                ))}
              </CardBody></Card>
            </Col>

            <Col xl={6}>
              <Card><CardBody>
                <h5 className="mb-1">Revenue by region</h5>
                <p className="text-muted small mb-3">Lagos to the world.</p>
                {(d.by_region || []).every((r) => r.revenue === 0) ? <p className="text-muted mb-0">No sales yet.</p> : (d.by_region || []).map((r) => (
                  <div key={r.region} className="mb-2">
                    <div className="d-flex justify-content-between small"><span>{r.region} <span className="text-muted">· {r.orders} order{r.orders === 1 ? '' : 's'}</span></span><span className="fw-semibold">{naira(r.revenue)}</span></div>
                    <div className="progress" style={{ height: 6 }}><div className={`progress-bar bg-${regionTone[r.region] || 'secondary'}`} style={{ width: `${(r.revenue / maxRegion) * 100}%` }} /></div>
                  </div>
                ))}
              </CardBody></Card>
            </Col>
            <Col xl={6}>
              <Card><CardBody>
                <h5 className="mb-1">New vs returning</h5>
                <p className="text-muted small mb-3">Turning buyers into repeat family.</p>
                {!split ? <p className="text-muted mb-0">No sales yet.</p> : (
                  <>
                    <div className="progress mb-3" style={{ height: 14 }}>
                      <div className="progress-bar bg-warning" style={{ width: `${((split.new?.revenue || 0) / splitTotal) * 100}%` }} title="New" />
                      <div className="progress-bar bg-success" style={{ width: `${((split.returning?.revenue || 0) / splitTotal) * 100}%` }} title="Returning" />
                    </div>
                    <Row className="text-center g-2">
                      <Col xs={6}>
                        <div className="border rounded py-2">
                          <div className="text-muted small">New <Badge bg="warning" className="bg-opacity-75">{split.new?.orders || 0}</Badge></div>
                          <div className="fw-bold">{naira(split.new?.revenue)}</div>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="border rounded py-2">
                          <div className="text-muted small">Returning <Badge bg="success" className="bg-opacity-75">{split.returning?.orders || 0}</Badge></div>
                          <div className="fw-bold">{naira(split.returning?.revenue)}</div>
                        </div>
                      </Col>
                    </Row>
                  </>
                )}
              </CardBody></Card>
            </Col>

            <Col xl={6}>
              <Card><CardBody className="pb-0"><h5 className="mb-3">Top products</h5></CardBody>
                <CardBody className="p-0">
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="table-light"><tr><th>Product</th><th className="text-end">Units</th><th className="text-end">Revenue</th></tr></thead>
                    <tbody>
                      {(d.top_products || []).length === 0 && <tr><td colSpan={3} className="text-center text-muted py-3">No sales yet.</td></tr>}
                      {(d.top_products || []).map((p, i) => <tr key={i}><td>{p.name}</td><td className="text-end">{p.units}</td><td className="text-end fw-semibold">{naira(p.revenue)}</td></tr>)}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
            <Col xl={6}>
              <Card><CardBody className="pb-0"><h5 className="mb-3">Low stock</h5></CardBody>
                <CardBody className="p-0">
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="table-light"><tr><th>Product</th><th>Variant</th><th className="text-end">Left</th></tr></thead>
                    <tbody>
                      {(d.low_stock || []).length === 0 && <tr><td colSpan={3} className="text-center text-muted py-3">Nothing low. 👍</td></tr>}
                      {(d.low_stock || []).map((s, i) => <tr key={i}><td>{s.product}</td><td className="text-muted small">{s.size || 'OS'}/{s.color || '—'}</td><td className="text-end"><Badge bg={s.stock === 0 ? 'danger' : 'warning'} className="bg-opacity-75">{s.stock}</Badge></td></tr>)}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </>
  );
};

export default AnalyticsPage;
