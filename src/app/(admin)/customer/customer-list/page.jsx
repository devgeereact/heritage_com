import PageTItle from '@/components/PageTItle';
import CustomerDataCard from './components/CustomerDataCard';
import CustomerDataList from './components/CustomerDataList';
const CustomerPage = () => {
  return <>
      <PageTItle title="Customer List" />
      <CustomerDataCard />
      <CustomerDataList />
    </>;
};
export default CustomerPage;