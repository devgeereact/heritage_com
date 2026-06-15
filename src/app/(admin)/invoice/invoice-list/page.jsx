import PageTitle from '@/components/PageTitle';
import InvoiceCard from './components/InvoiceCard';
import InvoiceList from './components/InvoiceList';
const InvoiceListPage = () => {
  return <>
      <PageTitle title="Invoices List" />
      <InvoiceCard />
      <InvoiceList />
    </>;
};
export default InvoiceListPage;