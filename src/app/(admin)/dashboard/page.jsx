import { useEffect, useState } from 'react';
import { Row, Alert } from 'react-bootstrap';
import PageTitle from '@/components/PageTitle';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import HeritKpis from './components/HeritKpis';
import AiBriefing from './components/AiBriefing';
import WorkshopSnapshot from './components/WorkshopSnapshot';
import PipeStatus from './components/PipeStatus';
import './dashboard.css';

const greeting = (h) => h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || '';
const longDate = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const DashboardPage = () => {
  const { user } = useAuthContext();
  const [stats, setStats] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    heritApi.stats()
      .then(setStats)
      .catch(() => setOffline(true));
  }, []);

  const now = new Date();
  const hi = firstName(user?.name);

  return (
    <>
      <PageTitle title="Dashboard" />

      <section className="herit-hero mb-4">
        <div className="herit-hero-rule" aria-hidden="true" />
        <div className="herit-hero-meta">
          <span>{longDate(now)}</span>
          <span className="herit-hero-dot" aria-hidden="true">·</span>
          <span>Lagos · Ajuwon Market</span>
        </div>
        <h1 className="herit-hero-title">
          {greeting(now.getHours())}{hi && <>, <em>{hi}</em></>}.
        </h1>
        <p className="herit-hero-sub">The brand at a glance — workshop, catalogue and enquiries, in one editorial spread.</p>
      </section>

      {offline && (
        <Alert variant="warning">
          <strong>Live figures offline.</strong> Upload the <code>php-api/</code> files + <code>config.php</code>
          and import <code>schema.sql</code> to populate the dashboard. The pipe check below confirms when it is live.
        </Alert>
      )}

      {stats && <HeritKpis stats={stats} />}

      <AiBriefing />

      <Row className="g-3 mt-1">
        {stats && <WorkshopSnapshot byStage={stats.tailoring.by_stage} />}
        <PipeStatus />
      </Row>
    </>
  );
};

export default DashboardPage;
