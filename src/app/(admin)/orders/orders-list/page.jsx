import PageTitle from '@/components/PageTitle';
import OrdersDataCardPage from './components/OrdersDataCard';
import OrdersList from './components/OrdersList';
const page = () => {
  return <>
      <PageTitle title="Order List" />
      <OrdersDataCardPage />
      <OrdersList />
    </>;
};
export default page;