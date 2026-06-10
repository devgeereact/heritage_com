import PageTItle from '@/components/PageTItle';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllBoxPlotCharts from './components/AllBoxPlotCharts';
const BoxPlotCharts = () => {
  return <>
      <PageTItle title="Apex Boxplot Chart" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllBoxPlotCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            link: '#basic',
            label: 'Basic Boxplot'
          }, {
            link: '#scatter',
            label: 'Scatter Boxplot'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default BoxPlotCharts;