import PageTItle from '@/components/PageTItle';
import { Row } from 'react-bootstrap';
import SellerDataEdit from './components/SellerDataEdit';
import SellerDetails from './components/SellerDetails';
const SellerEditPage = () => {
  return <>
      <PageTItle title="Seller Edit" />
      <Row>
        <SellerDetails />
        <SellerDataEdit />
      </Row>
    </>;
};
export default SellerEditPage;