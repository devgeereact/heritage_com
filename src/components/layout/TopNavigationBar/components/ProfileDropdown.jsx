import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useAuthContext } from '@/context/useAuthContext';
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import { Link } from 'react-router-dom';

// Top-right account menu. Reads the real signed-in user and links only to live
// HeritOS destinations — no Larkon demo pages.
const ProfileDropdown = () => {
  const { user, removeSession } = useAuthContext();
  const name = user?.name || user?.user?.name || 'Account';
  const email = user?.email || user?.user?.email || '';
  const role = (user?.role || user?.user?.role || '').replace('_', ' ');
  const initial = (name || 'H').trim().charAt(0).toUpperCase();

  return (
    <Dropdown className="topbar-item">
      <DropdownToggle as={'a'} type="button" className="topbar-button content-none" id="page-header-user-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <span className="d-flex align-items-center">
          <span className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold bg-primary text-white" style={{ width: 32, height: 32, fontSize: 14 }}>
            {initial}
          </span>
        </span>
      </DropdownToggle>
      <DropdownMenu className="dropdown-menu-end">
        <DropdownHeader as={'div'} className="dropdown-header">
          <div className="fw-semibold text-truncate">{name}</div>
          {email && <div className="small text-muted text-truncate">{email}</div>}
          {role && <span className="badge bg-primary-subtle text-primary mt-1 text-capitalize">{role}</span>}
        </DropdownHeader>
        <DropdownDivider className="my-1" />
        <DropdownItem as={Link} to="/profile">
          <IconifyIcon icon="solar:user-circle-bold-duotone" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">My profile</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/studio">
          <IconifyIcon icon="solar:magic-stick-3-bold-duotone" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Brand Studio</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/">
          <IconifyIcon icon="solar:shop-bold-duotone" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">View storefront</span>
        </DropdownItem>
        <DropdownDivider className="my-1" />
        <DropdownItem as={Link} className="text-danger" to="/auth/sign-in" onClick={removeSession}>
          <IconifyIcon icon="solar:logout-3-bold-duotone" className="fs-18 align-middle me-1" />
          <span className="align-middle">Sign out</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};

export default ProfileDropdown;
