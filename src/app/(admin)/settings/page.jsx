import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import PageHeader from '@/components/herit/PageHeader';
import StatusChip from '@/components/herit/StatusChip';
import BusinessSettings from './components/BusinessSettings';
import MeasurementTemplates from './components/MeasurementTemplates';

/** Settings (owner): business details, quote defaults, payment and measurement rules, templates. */
const SettingsPage = () => (
  <div className="hd" style={{ maxWidth: 900 }}>
    <PageTitle title="Settings" />
    <PageHeader title="Settings" subtitle={<>Shop channels and social links are in <Link to="/channels">Store and channels</Link>.</>} />
    <BusinessSettings />
    <MeasurementTemplates />
    <Card className="hd-card mb-3">
      <Card.Body>
        <h2 className="h5">Availability</h2>
        <StatusChip tone="neutral" icon="solar:calendar-bold">Coming in the next update</StatusChip>
        <p className="mt-2 mb-0 text-muted">Working hours and blocked time arrive with appointments.</p>
      </Card.Body>
    </Card>
  </div>
);

export default SettingsPage;
