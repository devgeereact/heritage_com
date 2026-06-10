import { Col, TabContainer } from 'react-bootstrap';
import { EmailProvider } from '@/context/useEmailContext';
import ComposeEmailModal from './ComposeEmailModal';
import EmailNavigationMenu from './EmailNavigationMenu';
import EmailTabList from './EmailTabList';
const EmailView = () => {
  return <EmailProvider>
      <TabContainer mountOnEnter defaultActiveKey="Inbox">
        <Col xxl={2}>
          <EmailNavigationMenu />
        </Col>
        <Col xxl={10}>
          <EmailTabList />

          <ComposeEmailModal />
        </Col>
      </TabContainer>
    </EmailProvider>;
};
export default EmailView;