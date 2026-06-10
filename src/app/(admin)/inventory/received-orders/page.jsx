import PageTItle from '@/components/PageTItle';
import ReceivedOrderData from './components/ReceivedOrderData';
import ReceivedOrdersDetails from './components/ReceivedOrdersDetails';
const ReceivedOrdersPage = () => {
  return <>
      <PageTItle title="Received Orders" />
      <ReceivedOrdersDetails />
      <ReceivedOrderData />
    </>;
};
export default ReceivedOrdersPage;