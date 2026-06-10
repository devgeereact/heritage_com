import { Row } from 'react-bootstrap';
import EmailView from './components/EmailView';
import PageTItle from '@/components/PageTItle';
const Email = () => {
  return <>
      <PageTItle title="Inbox" />
      <Row className="g-1 mb-3">
        <EmailView />
      </Row>
    </>;
};
export default Email;