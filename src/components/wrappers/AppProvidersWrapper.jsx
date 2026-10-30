import { AuthProvider } from '@/context/useAuthContext';
import { LayoutProvider } from '@/context/useLayoutContext';
import { NotificationProvider } from '@/context/useNotificationContext';
import { TitleProvider } from '@/context/useTitleContext';
import { ToastContainer } from 'react-toastify';
import ClerkBridge from '@/components/ClerkBridge';
import { clerkEnabled } from '@/helpers/clerk';
const AppProvidersWrapper = ({
  children
}) => {
  return <AuthProvider>
      {clerkEnabled && <ClerkBridge />}
      <LayoutProvider>
        <TitleProvider>
          <NotificationProvider>
            {children}
            <ToastContainer theme="colored" />
          </NotificationProvider>
        </TitleProvider>
      </LayoutProvider>
    </AuthProvider>;
};
export default AppProvidersWrapper;