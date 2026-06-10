import PageTItle from '@/components/PageTItle';
import { Col, Row } from 'react-bootstrap';
import Conversions from './components/Conversions';
import FriendsRequest from './components/FriendsRequest';
import ProjectSummary from './components/ProjectSummary';
import RecentTransactions from './components/RecentTransactions';
import Schedules from './components/Schedules';
import Statistic from './components/Statistic';
import Statistic2 from './components/Statistic2';
import Statistic3 from './components/Statistic3';
import Stats from './components/Stats';
import Tasks from './components/Tasks';
const WidgetsPage = () => {
  return <>
      <PageTItle title="Widget" />
      <Row>
        <Statistic />
      </Row>
      <Stats />
      <Row>
        <Col xl={6}>
          <ProjectSummary />
        </Col>
        <Col xl={6}>
          <Schedules />
        </Col>
      </Row>
      <Row>
        <Statistic2 />
      </Row>
      <Row>
        <Col xs={12}>
          <Conversions />
        </Col>
      </Row>
      <Statistic3 />
      <Row>
        <Col xl={4}>
          <Tasks />
        </Col>
        <Col xl={4}>
          <FriendsRequest />
        </Col>
        <Col xl={4}>
          <RecentTransactions />
        </Col>
      </Row>
    </>;
};
export default WidgetsPage;