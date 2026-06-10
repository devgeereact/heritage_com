import PageTItle from '@/components/PageTItle';
import { getProductById } from '@/helpers/data';
import { useEffect, useState } from 'react';
import { Row } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import ItemDetails from './components/ItemDetails';
import ProductDetails from './components/ProductDetails';
import Review from './components/Review';
import Step from './components/Step';
const ProductDetailsPage = () => {
  const [_product, setProduct] = useState();
  const {
    productId
  } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    ;
    (async () => {
      if (productId) {
        const data = await getProductById(productId);
        if (data) setProduct(data);else navigate('/pages-404');
      }
    })();
  }, []);
  return <>
      <PageTItle title="Product Details" />
      <ProductDetails />
      <Step />
      <Row>
        <ItemDetails />
        <Review />
      </Row>
    </>;
};
export default ProductDetailsPage;