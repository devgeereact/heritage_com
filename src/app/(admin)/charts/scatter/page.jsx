import PageTItle from '@/components/PageTItle';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllScatterCharts from './components/AllScatterCharts';
const ScatterCharts = () => {
  return <>
      <PageTItle title="Scatter Charts" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllScatterCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            link: '#basic',
            label: 'Scatter (XY) Chart'
          }, {
            link: '#datetime',
            label: 'Scatter Chart - Datetime'
          }, {
            link: '#images',
            label: 'Scatter - Images'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default ScatterCharts;