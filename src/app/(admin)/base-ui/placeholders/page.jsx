import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllPlaceholders from './components/AllPlaceholders';
import PageTItle from '@/components/PageTItle';
const PLaceholders = () => {
  return <>
      <PageTItle title="PLaceholder" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllPlaceholders />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            link: '#default',
            label: 'Overview'
          }, {
            link: '#how-works',
            label: 'How it works'
          }, {
            link: '#width',
            label: 'Width'
          }, {
            link: '#color',
            label: 'Color'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default PLaceholders;