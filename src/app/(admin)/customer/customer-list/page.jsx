import PageTitle from '@/components/PageTitle';
import CustomerDataCard from './components/CustomerDataCard';
import CustomerDataList from './components/CustomerDataList';
const CustomerPage = () => {
  return <>
      <PageTitle title="Customer List" />
      <CustomerDataCard />
      <CustomerDataList />
    </>;
};
export default CustomerPage;