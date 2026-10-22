import { Row, Col, Card, CardBody } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';

const Kpi = ({ icon, label, value, sub, to, tone = 'primary' }) => (
  <Col md={6} xl={3}>
    <Card>
      <CardBody>
        <div className="d-flex align-items-center gap-3">
          <div className={`avatar-md bg-${tone}-subtle rounded d-flex align-items-center justify-content-center`} style={{ width: 48, height: 48 }}>
            <IconifyIcon icon={icon} className={`fs-24 text-${tone}`} />
          </div>
          <div className="flex-grow-1">
            <p className="text-muted mb-0 small">{label}</p>
            <h4 className="mb-0">{value}</h4>
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span className="small text-muted">{sub}</span>
          {to && <Link to={to} className="small">View</Link>}
        </div>
      </CardBody>
    </Card>
  </Col>
);

const HeritKpis = ({ stats }) => {
  if (!stats) return null;
  const t = stats.tailoring, c = stats.catalogue, e = stats.enquiries;
  return (
    <Row className="g-3">
      <Kpi icon="solar:scissors-square-bold-duotone" tone="primary"
        label="Active tailoring jobs" value={t.active}
        sub={t.overdue ? `${t.overdue} overdue` : `${t.due_week} due this week`} to="/jobs" />
      <Kpi icon="solar:t-shirt-2-bold-duotone" tone="success"
        label="Products live" value={c.active}
        sub={`${c.stock_units} units in stock`} to="/catalogue" />
      <Kpi icon="solar:danger-triangle-bold-duotone" tone="danger"
        label="Stock alerts" value={c.low_stock + c.out_of_stock}
        sub={`${c.out_of_stock} out · ${c.low_stock} low`} to="/catalogue" />
      <Kpi icon="solar:inbox-line-bold-duotone" tone="warning"
        label="New enquiries" value={e.new}
        sub={`${e.total} all time`} to="/enquiries" />
    </Row>
  );
};

export default HeritKpis;
