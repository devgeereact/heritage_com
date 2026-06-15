import PageTitle from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllRadarCharts from './components/AllRadarCharts';
const RadarCharts = () => {
  return <>
      <PageTitle title="Radar Charts" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllRadarCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            label: 'Basic Radar Chart',
            link: '#basic'
          }, {
            label: 'Radar with Polygon-fill',
            link: '#polygon'
          }, {
            label: 'Radar – Multiple Series',
            link: '#multiple-series'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default RadarCharts;