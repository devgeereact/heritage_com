import { DEFAULT_PAGE_TITLE } from '@/context/constants';
import { AuthProvider } from '@/context/useAuthContext';
import { LayoutProvider } from '@/context/useLayoutContext';
import { NotificationProvider } from '@/context/useNotificationContext';
import { TitleProvider } from '@/context/useTitleContext';
import { useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
const AppProvidersWrapper = ({
  children
}) => {
  const handleChangeTitle = () => {
    if (document.visibilityState === 'hidden') {
      document.title = 'Please come back 🥺';
    } else {
      document.title = DEFAULT_PAGE_TITLE;
    }
  };
  useEffect(() => {
    const splash = document.querySelector('#__next_splash');
    if (splash?.hasChildNodes()) {
      document.querySelector('#splash-screen')?.classList.add('remove');
    }
    splash?.addEventListener('DOMNodeInserted', () => {
      document.querySelector('#splash-screen')?.classList.add('remove');
    });
    document.addEventListener('visibilitychange', handleChangeTitle);
    return () => document.removeEventListener('visibilitychange', handleChangeTitle);
  }, []);
  return <AuthProvider>
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