import UIExamplesList from '@/components/UIExamplesList';
import { Col, Container, Row } from 'react-bootstrap';
import AllPagination from './components/AllPagination';
import PageTitle from '@/components/PageTitle';
const Pagination = () => {
  return <>
      <PageTitle title="Pagination" />
      <Container>
        <Row>
          <Col xl={9}>
            <AllPagination />
          </Col>
          <Col xl={3}>
            <UIExamplesList examples={[{
            link: '#default-buttons',
            label: 'Default Pagination'
          }, {
            link: '#rounded-pagination',
            label: 'Rounded Pagination'
          }, {
            link: '#alignment',
            label: 'Alignment'
          }, {
            link: '#sizing',
            label: 'Sizing'
          }]} />
          </Col>
        </Row>
      </Container>
    </>;
};
export default Pagination;