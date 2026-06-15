import PageTitle from '@/components/PageTitle';
import CouponsBoxs from './components/CouponsBoxs';
import CouponsDataList from './components/CouponsDataList';
const CouponsListPage = () => {
  return <>
      <PageTitle title="Coupons" />
      <CouponsBoxs />
      <CouponsDataList />
    </>;
};
export default CouponsListPage;