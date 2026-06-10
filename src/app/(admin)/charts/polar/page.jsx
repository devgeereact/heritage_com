import PageTItle from '@/components/PageTItle';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllPolarAreaCharts from './components/AllPolarAreaCharts';
const PolarAreaCharts = () => {
  return <>
      <PageTItle title="Polar Area Charts" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllPolarAreaCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            link: '#basic',
            label: 'Basic Polar Area Chart'
          }, {
            link: '#monochrome',
            label: 'Monochrome Polar Area'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default PolarAreaCharts;