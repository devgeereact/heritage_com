import { Navigate, Route, Routes } from 'react-router-dom';

// import AuthLayout from '@/layouts/AuthLayout'
import { appRoutes, authRoutes, publicRoutes, redirectRoutes } from '@/routes/index';
import { useAuthContext } from '@/context/useAuthContext';
import { canAccessPath, roleHome } from '@/helpers/roles';
import OtherLayout from '@/layout/OtherLayout';
import AdminLayout from '@/layout/AdminLayout';
const AppRouter = props => {
  const {
    isAuthenticated,
    user
  } = useAuthContext();
  return <Routes>
      {(publicRoutes || []).map((route, idx) => <Route key={idx + route.name} path={route.path} element={<OtherLayout {...props}>{route.element}</OtherLayout>} />)}

      {(authRoutes || []).map((route, idx) => <Route key={idx + route.name} path={route.path} element={<OtherLayout {...props}>{route.element}</OtherLayout>} />)}

      {(redirectRoutes || []).map((route) => <Route key={route.name} path={route.path} element={route.element} />)}

      {(appRoutes || []).map((route, idx) => {
      let element;
      if (!isAuthenticated) {
        element = <Navigate to={{
          pathname: '/auth/sign-in',
          search: 'redirectTo=' + encodeURIComponent(window.location.pathname + window.location.search)
        }} />;
      } else if (!canAccessPath(user?.role, route.path)) {
        // Authenticated but this role can't use this section — send them home.
        element = <Navigate to={roleHome(user?.role)} replace />;
      } else {
        element = <AdminLayout {...props}>{route.element}</AdminLayout>;
      }
      return <Route key={idx + route.name} path={route.path} element={element} />;
    })}
    </Routes>;
};
export default AppRouter;