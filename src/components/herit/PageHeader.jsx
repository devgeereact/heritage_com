import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';

/** Page heading with an optional back link, subtitle and actions (one primary). */
const PageHeader = ({ title, subtitle, back, actions }) => (
  <div className="hd-page-header d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
    <div className="min-w-0">
      {back && (
        <Link to={back.to} className="d-inline-flex align-items-center gap-1 mb-1 small">
          <IconifyIcon icon="solar:arrow-left-linear" aria-hidden="true" /> {back.label}
        </Link>
      )}
      <h1 className="hd-title">{title}</h1>
      {subtitle && <div className="text-muted mt-1">{subtitle}</div>}
    </div>
    {actions && <div className="d-flex gap-2 flex-wrap">{actions}</div>}
  </div>
);

export default PageHeader;
