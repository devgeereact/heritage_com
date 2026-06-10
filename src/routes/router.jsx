import { Navigate, Route, Routes } from 'react-router-dom';

// import AuthLayout from '@/layouts/AuthLayout'
import { appRoutes, authRoutes, publicRoutes } from '@/routes/index';
import { useAuthContext } from '@/context/useAuthContext';
import OtherLayout from '@/layout/OtherLayout';
import AdminLayout from '@/layout/AdminLayout';
const AppRouter = props => {
  const {
    isAuthenticated
  } = useAuthContext();
  return <Routes>
      {(publicRoutes || []).map((route, idx) => <Route key={idx + route.name} path={route.path} element={<OtherLayout {...props}>{route.element}</OtherLayout>} />)}

      {(authRoutes || []).map((route, idx) => <Route key={idx + route.name} path={route.path} element={<OtherLayout {...props}>{route.element}</OtherLayout>} />)}

      {(appRoutes || []).map((route, idx) => <Route key={idx + route.name} path={route.path} element={isAuthenticated ? <AdminLayout {...props}>{route.element}</AdminLayout> : <Navigate to={{
      pathname: '/auth/sign-in',
      search: 'redirectTo=' + route.path
    }} />} />)}
    </Routes>;
};
export default AppRouter;