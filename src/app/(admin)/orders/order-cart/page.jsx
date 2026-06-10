import PageTItle from '@/components/PageTItle';
import { Row } from 'react-bootstrap';
import OrderCartData from './components/OrderCartData';
import OrderSummary from './components/OrderSummary';
const OrderCartPage = () => {
  return <>
      <PageTItle title="Order Cart" />
      <Row>
        <OrderCartData />
        <OrderSummary />
      </Row>
    </>;
};
export default OrderCartPage;