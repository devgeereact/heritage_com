import AllOffcanvas from './components/AllOffcanvas';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import PageTitle from '@/components/PageTitle';
const Offcanvas = () => {
  return <>
      <PageTitle title="Offcanvas" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllOffcanvas />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            label: 'Default Offcanvas',
            link: '#default'
          }, {
            label: 'Static Backdrop',
            link: '#static-backdrop'
          }, {
            label: 'Offcanvas Position',
            link: '#offcanvas-position'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default Offcanvas;