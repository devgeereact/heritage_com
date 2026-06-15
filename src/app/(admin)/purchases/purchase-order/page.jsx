import PageTitle from '@/components/PageTitle';
import PurchaseList from './components/PurchaseList';
import PurchaseOrder from './components/PurchaseOrder';
const PurchaseOrderPage = () => {
  return <>
      <PageTitle title="Purchase Order" />
      <PurchaseOrder />
      <PurchaseList />
    </>;
};
export default PurchaseOrderPage;