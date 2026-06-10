import PageTItle from '@/components/PageTItle';
import { Row } from 'react-bootstrap';
import AddProduct from './components/AddProduct';
import ProductDetails from './components/ProductDetails';
const ProductAddPage = () => {
  return <>
      <PageTItle title="Create Product" />
      <Row>
        <ProductDetails />
        <AddProduct />
      </Row>
    </>;
};
export default ProductAddPage;