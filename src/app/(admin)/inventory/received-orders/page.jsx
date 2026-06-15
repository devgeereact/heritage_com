import PageTitle from '@/components/PageTitle';
import ReceivedOrderData from './components/ReceivedOrderData';
import ReceivedOrdersDetails from './components/ReceivedOrdersDetails';
const ReceivedOrdersPage = () => {
  return <>
      <PageTitle title="Received Orders" />
      <ReceivedOrdersDetails />
      <ReceivedOrderData />
    </>;
};
export default ReceivedOrdersPage;