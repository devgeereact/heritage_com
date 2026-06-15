import PageTitle from '@/components/PageTitle';
import LatestProduct from './components/LatestProduct';
import SellerChat from './components/SellerChat';
import SellerDetails from './components/SellerDetails';
const SellerDetailsPage = () => {
  return <>
      <PageTitle title="Seller Details" />
      <SellerDetails />
      <SellerChat />
      <LatestProduct />
    </>;
};
export default SellerDetailsPage;