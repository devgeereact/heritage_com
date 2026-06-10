import PageTItle from '@/components/PageTItle';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllCandlestickCharts from './components/AllCandlestickCharts';
const CandlestickCharts = () => {
  return <>
      <PageTItle title="Candlestick Charts" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllCandlestickCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            link: '#simple',
            label: 'Simple Candlestick Chart'
          }, {
            link: '#x-axis',
            label: 'Category X-Axis'
          }, {
            link: '#line',
            label: 'Candlestick with Line'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default CandlestickCharts;