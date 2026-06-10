import PageTItle from '@/components/PageTItle';
import InvoiceCard from './components/InvoiceCard';
import InvoiceList from './components/InvoiceList';
const InvoiceListPage = () => {
  return <>
      <PageTItle title="Invoices List" />
      <InvoiceCard />
      <InvoiceList />
    </>;
};
export default InvoiceListPage;