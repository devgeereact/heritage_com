import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PageTitle from '@/components/PageTitle';
import CustomersSettings from './components/CustomersSettings';
import GeneralSettings from './components/GeneralSettings';
import LocalizationSettings from './components/LocalizationSettings';
import SettingsBoxs from './components/SettingsBoxs';
import StoreSettings from './components/StoreSettings';

const SettingsPage = () => {
  return <>
      <PageTitle title="Settings" />
      <GeneralSettings />
      <StoreSettings />
      <LocalizationSettings />
      <SettingsBoxs />
      <CustomersSettings />
      <div className="text-end d-flex gap-2 justify-content-end">
        <Button as={Link} to="" variant="light">Cancel</Button>
        <Button as={Link} to="" variant="primary">Save change</Button>
      </div>
    </>;
};
export default SettingsPage;