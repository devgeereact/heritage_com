import { Card, CardBody, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';

const STAGES = [
  { key: 'measure', label: 'Measure', icon: 'solar:ruler-bold' },
  { key: 'cut', label: 'Cut', icon: 'solar:scissors-bold' },
  { key: 'sew', label: 'Sew', icon: 'solar:magic-stick-3-bold' },
  { key: 'finish', label: 'Finish', icon: 'solar:iron-bold' },
  { key: 'fitting', label: 'Fitting', icon: 'solar:user-check-bold' },
  { key: 'done', label: 'Done', icon: 'solar:check-circle-bold' },
];

const WorkshopSnapshot = ({ byStage = {} }) => {
  const max = Math.max(1, ...STAGES.map((s) => byStage[s.key] || 0));
  return (
    <Col xl={8}>
      <Card>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">Workshop by stage</h5>
            <Link to="/jobs" className="small">Open jobs</Link>
          </div>
          {STAGES.map((s) => {
            const n = byStage[s.key] || 0;
            return (
              <div key={s.key} className="d-flex align-items-center gap-2 py-1">
                <span className="text-muted d-inline-flex align-items-center gap-1" style={{ width: 90 }}>
                  <IconifyIcon icon={s.icon} aria-hidden="true" /> {s.label}
                </span>
                <div
                  className="flex-grow-1 bg-light rounded"
                  style={{ height: 8 }}
                  role="progressbar"
                  aria-label={`${s.label} stage`}
                  aria-valuenow={n}
                  aria-valuemin={0}
                  aria-valuemax={max}
                >
                  <div className="bg-primary rounded" style={{ height: 8, width: `${(n / max) * 100}%`, minWidth: n ? 8 : 0 }} />
                </div>
                <span className="fw-semibold" style={{ width: 24, textAlign: 'right' }}>{n}</span>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </Col>
  );
};

export default WorkshopSnapshot;
