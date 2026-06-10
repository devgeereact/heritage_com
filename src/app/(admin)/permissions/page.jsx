import PageTItle from '@/components/PageTItle';
import PermissionsCard from './components/PermissionsCard';
import PermissionsList from './components/PermissionsList';
const PermissionsPage = () => {
  return <>
      <PageTItle title="Permissions" />
      <PermissionsCard />
      <PermissionsList />
    </>;
};
export default PermissionsPage;