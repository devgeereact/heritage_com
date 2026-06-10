import AllOffcanvas from './components/AllOffcanvas';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import PageTItle from '@/components/PageTItle';
const Offcanvas = () => {
  return <>
      <PageTItle title="Offcanvas" />
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