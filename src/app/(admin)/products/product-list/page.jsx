import PageTitle from '@/components/PageTitle';
import { Col, Row } from 'react-bootstrap';
import ProductList from './Components/ProductList';
const ProductListPage = () => {
  return <>
      <PageTitle title="Product List" />
      <Row>
        <Col xl={12}>
          <ProductList />
        </Col>
      </Row>
    </>;
};
export default ProductListPage;