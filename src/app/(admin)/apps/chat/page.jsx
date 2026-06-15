import PageTitle from '@/components/PageTitle';
import { ChatProvider } from '@/context/useChatContext';
import { Row } from 'react-bootstrap';
import ChatApp from './components/ChatApp';
const ChatPage = () => {
  return <>
      <PageTitle title="Chat" />
      <Row className="g-1">
        <ChatProvider>
          <ChatApp />
        </ChatProvider>
      </Row>
    </>;
};
export default ChatPage;