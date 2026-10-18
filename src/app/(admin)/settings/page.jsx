import { Link } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import PageHeader from '@/components/herit/PageHeader';
import BusinessSettings from './components/BusinessSettings';
import MeasurementTemplates from './components/MeasurementTemplates';
import AvailabilitySettings from './components/AvailabilitySettings';
import PortalSettings from './components/PortalSettings';
import RetentionSettings from './components/RetentionSettings';

/** Settings (owner): business details, quote defaults, payment and measurement rules, templates, availability, the client portal and data retention. */
const SettingsPage = () => (
  <div className="hd" style={{ maxWidth: 900 }}>
    <PageTitle title="Settings" />
    <PageHeader title="Settings" subtitle={<>Shop channels and social links are in <Link to="/channels">Store and channels</Link>.</>} />
    <BusinessSettings />
    <MeasurementTemplates />
    <AvailabilitySettings />
    <PortalSettings />
    <RetentionSettings />
  </div>
);

export default SettingsPage;
