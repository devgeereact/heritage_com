import PageTItle from '@/components/PageTItle';
import OrdersDataCardPage from './components/OrdersDataCard';
import OrdersList from './components/OrdersList';
const page = () => {
  return <>
      <PageTItle title="Order List" />
      <OrdersDataCardPage />
      <OrdersList />
    </>;
};
export default page;