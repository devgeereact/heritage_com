import PageTItle from '@/components/PageTItle';
import CustomersSettings from './components/CustomersSettings';
import GeneralSettings from './components/GeneralSettings';
import LocalizationSettings from './components/LocalizationSettings';
import SettingsBoxs from './components/SettingsBoxs';
import StoreSettings from './components/StoreSettings';
import { Link } from 'react-router-dom';
const SettingsPage = () => {
  return <>
      <PageTItle title="Settings" />
      <GeneralSettings />
      <StoreSettings />
      <LocalizationSettings />
      <SettingsBoxs />
      <CustomersSettings />
      <div className="text-end">
        <Link to="" className="btn btn-danger">
          Cancel
        </Link>
        &nbsp;
        <Link to="" className="btn btn-success">
          Save Change
        </Link>
      </div>
    </>;
};
export default SettingsPage;