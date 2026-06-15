import PageTitle from '@/components/PageTitle';
import { Row } from 'react-bootstrap';
import AddProduct from './components/AddProduct';
import ProductDetails from './components/ProductDetails';
const ProductEditPage = () => {
  return <>
      <PageTitle title="Product Edit" />
      <Row>
        <ProductDetails />
        <AddProduct />
      </Row>
    </>;
};
export default ProductEditPage;