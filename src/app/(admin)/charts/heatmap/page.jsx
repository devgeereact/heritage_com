import PageTItle from '@/components/PageTItle';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllHeatmapCharts from './components/AllHeatmapCharts';
const HeatmapCharts = () => {
  return <>
      <PageTItle title="Heatmap Charts" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllHeatmapCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            link: '#basic',
            label: 'Basic Heatmap - Single Series'
          }, {
            link: '#multiple-series',
            label: 'Heatmap - Multiple Series'
          }, {
            link: '#color-range',
            label: 'Heatmap - Color Range'
          }, {
            link: '#rounded',
            label: 'Heatmap - Range without Shades'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default HeatmapCharts;