import PageTItle from '@/components/PageTItle';
import { Row } from 'react-bootstrap';
import AddProduct from './components/AddProduct';
import ProductDetails from './components/ProductDetails';
const ProductEditPage = () => {
  return <>
      <PageTItle title="Product Edit" />
      <Row>
        <ProductDetails />
        <AddProduct />
      </Row>
    </>;
};
export default ProductEditPage;