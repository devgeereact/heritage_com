import PageTItle from '@/components/PageTItle';
import LatestProduct from './components/LatestProduct';
import SellerChat from './components/SellerChat';
import SellerDetails from './components/SellerDetails';
const SellerDetailsPage = () => {
  return <>
      <PageTItle title="Seller Details" />
      <SellerDetails />
      <SellerChat />
      <LatestProduct />
    </>;
};
export default SellerDetailsPage;