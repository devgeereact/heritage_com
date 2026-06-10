import PageTItle from '@/components/PageTItle';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllTimelineCharts from './components/AllTimelineCharts';
const TimelineCharts = () => {
  return <>
      <PageTItle title="Timeline Charts" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllTimelineCharts />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            link: '#basic',
            label: 'Basic Timeline'
          }, {
            link: '#distributed',
            label: 'Distributed Timeline'
          }, {
            link: '#multi-series',
            label: 'Multi Series Timeline'
          }, {
            link: '#advanced',
            label: 'Advanced Timeline'
          }, {
            link: '#group-rows',
            label: 'Multiple Series - Group Rows'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default TimelineCharts;