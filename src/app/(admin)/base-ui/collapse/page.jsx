import UIExamplesList from '@/components/UIExamplesList';
import AllCollapse from './components/AllCollapse';
import { Col, Container, Row } from 'react-bootstrap';
import PageTitle from '@/components/PageTitle';
const Collapse = () => {
  return <>
      <PageTitle title="Collapse" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllCollapse />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            label: 'Default Example',
            link: '#default'
          }, {
            label: 'Horizontal Collapse',
            link: '#horizontal'
          }, {
            label: 'Multiple Targets',
            link: '#multiple-targets'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default Collapse;