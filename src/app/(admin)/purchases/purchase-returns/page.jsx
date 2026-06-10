import PageTItle from '@/components/PageTItle';
import PurchaseListPage from '../purchase-list/page';
import ReturnDataCard from './Components/ReturnDataCard';
const PurchaseReturnsPage = () => {
  return <>
      <PageTItle title="Purchase order" />
      <ReturnDataCard />
      <PurchaseListPage />
    </>;
};
export default PurchaseReturnsPage;