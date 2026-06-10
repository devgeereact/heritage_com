import { Row } from 'react-bootstrap';
import Conversions from './components/Conversions';
import Orders from './components/Orders';
import Stats from './components/Stats';
import PipeStatus from './components/PipeStatus';

//

const DashboardPage = () => {
  return <>
      <Row>
        <Stats />
        <Conversions />
        <Orders />
      </Row>
      <Row>
        <PipeStatus />
      </Row>
    </>;
};
export default DashboardPage;