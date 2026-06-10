import avatar1 from '@/assets/images/users/avatar-1.jpg';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useAuthContext } from '@/context/useAuthContext';
import { Dropdown, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const ProfileDropdown = () => {
  const {
    removeSession
  } = useAuthContext();
  return <Dropdown className="topbar-item">
      <DropdownToggle as={'a'} type="button" className="topbar-button content-none" id="page-header-user-dropdown " data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <span className="d-flex align-items-center">
          <img className="rounded-circle" width={32} src={avatar1} alt="avatar-3" />
        </span>
      </DropdownToggle>
      <DropdownMenu className="dropdown-menu-end">
        <DropdownHeader as={'h6'} className="dropdown-header">
          Welcome Gaston!
        </DropdownHeader>
        <DropdownItem as={Link} to="/profile">
          <IconifyIcon icon="bx:user-circle" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Profile</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/apps/chat">
          <IconifyIcon icon="bx:message-dots" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Messages</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/pages/pricing">
          <IconifyIcon icon="bx:wallet" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Pricing</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/support/faqs">
          <IconifyIcon icon="bx:help-circle" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Help</span>
        </DropdownItem>
        <DropdownItem as={Link} to="/auth/lock-screen">
          <IconifyIcon icon="bx:lock" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Lock screen</span>
        </DropdownItem>
        <div className="dropdown-divider my-1" />
        <DropdownItem as={Link} className=" text-danger" to="/auth/sign-in">
          <IconifyIcon icon="bx:log-out" className="fs-18 align-middle me-1" />
          <span className="align-middle" onClick={removeSession}>
            Logout
          </span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>;
};
export default ProfileDropdown;