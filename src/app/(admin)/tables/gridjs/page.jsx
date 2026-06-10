import UIExamplesList from '@/components/UIExamplesList';
import { getAllDataTableRecords } from '@/helpers/data';
import { Col, Container, Row } from 'react-bootstrap';
import AllDataTables from './components/AllDataTables';
import PageTItle from '@/components/PageTItle';
import { useFetchData } from '@/hooks/useFetchData';
const GridJS = () => {
  const dataTableRecords = useFetchData(getAllDataTableRecords);
  return <>
      <PageTItle title="GridJs Table" />
      <Container>
        <Row>
          {dataTableRecords && <Col xl={10}>
              {' '}
              <AllDataTables dataTableRecords={dataTableRecords} />
            </Col>}
          <Col xl={2}>
            {dataTableRecords && <UIExamplesList examples={[{
            link: '#overview',
            label: 'Overview'
          }, {
            link: '#basic',
            label: 'Basic'
          }, {
            link: '#pagination',
            label: 'Pagination'
          }, {
            link: '#search',
            label: 'Search'
          }, {
            link: '#sorting',
            label: 'Sorting'
          }, {
            link: '#loading_state',
            label: 'Loading State'
          }, {
            link: '#fixed_header',
            label: 'Fixed Header'
          }, {
            link: '#hidden_column',
            label: 'Hidden Columns'
          }]} />}
          </Col>
        </Row>
      </Container>
    </>;
};
export default GridJS;