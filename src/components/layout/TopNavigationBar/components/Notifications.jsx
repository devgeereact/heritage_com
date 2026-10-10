import { useEffect, useState } from 'react';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient';
import heritApi from '@/helpers/heritApi';
import { useAuthContext } from '@/context/useAuthContext';
import { canAccessSection } from '@/helpers/roles';
import { Dropdown, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';

// Real notifications: new customer enquiries from the contact form. Falls back
// silently (no badge) when the API isn't reachable.
const timeAgo = (ts) => {
  if (!ts) return '';
  const d = Math.floor((Date.now() - new Date(String(ts).replace(' ', 'T')).getTime()) / 60000);
  if (isNaN(d)) return '';
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
};

const Notifications = () => {
  const [items, setItems] = useState([]);
  const { user } = useAuthContext();
  // Only roles the server lets read enquiries ask for them (K-01: no 403 noise).
  const allowed = canAccessSection(user?.role, 'enquiries');

  useEffect(() => {
    if (!allowed) return undefined;
    let live = true;
    heritApi.contact.list()
      .then((r) => { if (live) setItems((Array.isArray(r) ? r : []).filter((e) => e.status === 'new').slice(0, 8)); })
      .catch(() => {});
    return () => { live = false; };
  }, [allowed]);

  const count = items.length;

  return (
    <Dropdown className="topbar-item">
      <DropdownToggle as={'a'} type="button" className="topbar-button position-relative content-none" id="page-header-notifications-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <IconifyIcon icon="solar:bell-bing-bold-duotone" className="fs-24 align-middle" />
        {count > 0 && (
          <span className="position-absolute topbar-badge fs-10 translate-middle badge bg-danger rounded-pill">
            {count}<span className="visually-hidden">new enquiries</span>
          </span>
        )}
      </DropdownToggle>
      <DropdownMenu className="py-0 dropdown-lg dropdown-menu-end" aria-labelledby="page-header-notifications-dropdown">
        <div className="p-3 border-bottom border-dashed">
          <Row className="align-items-center">
            <div className="col">
              <h6 className="m-0 fs-16 fw-semibold">Enquiries</h6>
            </div>
            <div className="col-auto">
              <Link to="/enquiries" className="text-muted text-decoration-underline"><small>View all</small></Link>
            </div>
          </Row>
        </div>
        <SimplebarReactClient style={{ maxHeight: 280 }}>
          {count === 0 ? (
            <div className="text-center text-muted py-4 small">No new enquiries. 🎉</div>
          ) : items.map((e, idx) => (
            <Link key={idx} to="/enquiries" className="dropdown-item py-3 border-bottom text-wrap">
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <span className="avatar-sm d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary fs-20 rounded-circle">
                    {(e.name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-grow-1 ms-2">
                  <p className="mb-0 fw-semibold">{e.name || 'New enquiry'} <span className="text-muted fw-normal small">· {timeAgo(e.created_at)}</span></p>
                  <p className="mb-0 text-wrap text-muted small">{(e.message || e.interest || 'New message').slice(0, 80)}</p>
                </div>
              </div>
            </Link>
          ))}
        </SimplebarReactClient>
        <div className="text-center py-2 border-top border-dashed">
          <Link to="/enquiries" className="btn btn-primary btn-sm">Open enquiries</Link>
        </div>
      </DropdownMenu>
    </Dropdown>
  );
};

export default Notifications;
