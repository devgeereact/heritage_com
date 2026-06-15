import PageTitle from '@/components/PageTitle';
import PurchaseListPage from '../purchase-list/page';
import ReturnDataCard from './Components/ReturnDataCard';
const PurchaseReturnsPage = () => {
  return <>
      <PageTitle title="Purchase order" />
      <ReturnDataCard />
      <PurchaseListPage />
    </>;
};
export default PurchaseReturnsPage;