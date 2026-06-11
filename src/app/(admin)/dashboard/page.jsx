import { useEffect, useState } from 'react';
import { Row, Alert } from 'react-bootstrap';
import PageTItle from '@/components/PageTItle';
import heritApi from '@/helpers/heritApi';
import HeritKpis from './components/HeritKpis';
import WorkshopSnapshot from './components/WorkshopSnapshot';
import PipeStatus from './components/PipeStatus';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    heritApi.stats()
      .then(setStats)
      .catch(() => setOffline(true));
  }, []);

  return (
    <>
      <PageTItle title="Dashboard" />
      <div className="mb-3">
        <h4 className="mb-1">Welcome back</h4>
        <p className="text-muted mb-0">The brand at a glance — workshop, catalogue and enquiries.</p>
      </div>

      {offline && (
        <Alert variant="warning">
          <strong>Live figures offline.</strong> Upload the <code>php-api/</code> files + <code>config.php</code>
          and import <code>schema.sql</code> to populate the dashboard. The pipe check below confirms when it is live.
        </Alert>
      )}

      {stats && <HeritKpis stats={stats} />}

      <Row className="g-3 mt-1">
        {stats && <WorkshopSnapshot byStage={stats.tailoring.by_stage} />}
        <PipeStatus />
      </Row>
    </>
  );
};

export default DashboardPage;
