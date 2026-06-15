import PageTitle from '@/components/PageTitle';
import { Row } from 'react-bootstrap';
import AddProduct from './components/AddProduct';
import ProductDetails from './components/ProductDetails';
const ProductAddPage = () => {
  return <>
      <PageTitle title="Create Product" />
      <Row>
        <ProductDetails />
        <AddProduct />
      </Row>
    </>;
};
export default ProductAddPage;