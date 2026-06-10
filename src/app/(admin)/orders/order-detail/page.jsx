import PageTItle from '@/components/PageTItle';
import { Col, Row } from 'react-bootstrap';
import OrderDetails from './components/OrderDetails';
import OrderTags from './components/OrderTags';
import OrderTimeline from './components/OrderTimeline';
import ProductDataList from './components/ProductDataList';
import ProgressCard from './components/ProgressCard';
const OrderDetailPage = () => {
  return <>
      <PageTItle title="Order Details" />
      <Row>
        <Col xl={9} lg={8}>
          <Row>
            <Col lg={12}>
              <ProgressCard />
              <ProductDataList />
              <OrderTimeline />
              <OrderTags />
            </Col>
          </Row>
        </Col>
        <Col xl={3} lg={4}>
          <OrderDetails />
        </Col>
      </Row>
    </>;
};
export default OrderDetailPage;