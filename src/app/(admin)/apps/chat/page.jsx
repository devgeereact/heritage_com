import PageTItle from '@/components/PageTItle';
import { ChatProvider } from '@/context/useChatContext';
import { Row } from 'react-bootstrap';
import ChatApp from './components/ChatApp';
const ChatPage = () => {
  return <>
      <PageTItle title="Chat" />
      <Row className="g-1">
        <ChatProvider>
          <ChatApp />
        </ChatProvider>
      </Row>
    </>;
};
export default ChatPage;