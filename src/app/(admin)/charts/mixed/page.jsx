import PageTItle from '@/components/PageTItle';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllMixedCharts from './components/AllMixedCharts';
const MixedCharts = () => {
  return <>
      <PageTItle title="Mixed Charts" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllMixedCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            link: '#line-column',
            label: 'Line & Column Chart'
          }, {
            link: '#multiple-yaxis',
            label: 'Multiple Y-Axis Chart'
          }, {
            link: '#line-area',
            label: 'Line & Area Chart'
          }, {
            link: '#all',
            label: 'Line, Column & Area Chart'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default MixedCharts;