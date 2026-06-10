import PageTItle from '@/components/PageTItle';
import PurchaseList from './components/PurchaseList';
import PurchaseOrder from './components/PurchaseOrder';
const PurchaseOrderPage = () => {
  return <>
      <PageTItle title="Purchase Order" />
      <PurchaseOrder />
      <PurchaseList />
    </>;
};
export default PurchaseOrderPage;