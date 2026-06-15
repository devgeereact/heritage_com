import PageTitle from '@/components/PageTitle';
import { Row } from 'react-bootstrap';
import OrderCartData from './components/OrderCartData';
import OrderSummary from './components/OrderSummary';
const OrderCartPage = () => {
  return <>
      <PageTitle title="Order Cart" />
      <Row>
        <OrderCartData />
        <OrderSummary />
      </Row>
    </>;
};
export default OrderCartPage;