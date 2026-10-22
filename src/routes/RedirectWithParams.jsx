import { Navigate, useLocation, useParams } from 'react-router-dom';

/**
 * Old URL → new URL, keeping :params and the query string, e.g.
 * /tailoring/12?tab=quote → /jobs/12?tab=quote. The target route then applies
 * sign-in and role checks.
 */
const RedirectWithParams = ({ to }) => {
  const params = useParams();
  const { search, hash } = useLocation();
  const path = to.replace(/:(\w+)/g, (_, k) => encodeURIComponent(params[k] ?? ''));
  return <Navigate to={`${path}${search}${hash}`} replace />;
};

export default RedirectWithParams;
