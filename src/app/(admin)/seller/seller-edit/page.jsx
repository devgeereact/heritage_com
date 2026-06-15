import PageTitle from '@/components/PageTitle';
import { Row } from 'react-bootstrap';
import SellerDataEdit from './components/SellerDataEdit';
import SellerDetails from './components/SellerDetails';
const SellerEditPage = () => {
  return <>
      <PageTitle title="Seller Edit" />
      <Row>
        <SellerDetails />
        <SellerDataEdit />
      </Row>
    </>;
};
export default SellerEditPage;