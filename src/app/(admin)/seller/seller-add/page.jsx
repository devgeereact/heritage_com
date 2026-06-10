import PageTItle from '@/components/PageTItle';
import { Row } from 'react-bootstrap';
import SellerAddData from './components/SellerAddData';
import SellerAddDetails from './components/SellerAddDetails';
const SellerAddPage = () => {
  return <>
      <PageTItle title="Seller Add" />
      <Row>
        <SellerAddDetails />
        <SellerAddData />
      </Row>
    </>;
};
export default SellerAddPage;