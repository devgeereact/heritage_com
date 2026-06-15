import { Row } from 'react-bootstrap';
import EmailView from './components/EmailView';
import PageTitle from '@/components/PageTitle';
const Email = () => {
  return <>
      <PageTitle title="Inbox" />
      <Row className="g-1 mb-3">
        <EmailView />
      </Row>
    </>;
};
export default Email;