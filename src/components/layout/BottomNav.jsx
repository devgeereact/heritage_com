import { useState } from 'react';
import { ListGroup, Offcanvas } from 'react-bootstrap';
import { Link, NavLink, useLocation } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useAuthContext } from '@/context/useAuthContext';
import { canAccessSection } from '@/helpers/roles';

const MAIN = [
  { key: 'today', label: 'Today', icon: 'solar:home-smile-bold', to: '/today' },
  { key: 'jobs', label: 'Jobs', icon: 'solar:scissors-square-bold', to: '/jobs' },
  { key: 'appointments', label: 'Appointments', icon: 'solar:calendar-bold', to: '/appointments' },
];
const MORE = [
  { key: 'enquiries', label: 'Enquiries', icon: 'solar:inbox-line-bold-duotone', to: '/enquiries' },
  { key: 'messages', label: 'Messages', icon: 'solar:chat-round-dots-bold-duotone', to: '/messages' },
  { key: 'clients', label: 'Clients', icon: 'solar:users-group-rounded-bold-duotone', to: '/clients' },
  { key: 'payments', label: 'Payments', icon: 'solar:wallet-money-bold-duotone', to: '/payments' },
  { key: 'content', label: 'Website', icon: 'solar:global-bold-duotone', to: '/content' },
  { key: 'settings', label: 'Settings', icon: 'solar:settings-bold-duotone', to: '/settings' },
];

/**
 * Phone navigation (below the lg breakpoint): Today, Jobs, Appointments and
 * More. More opens a bottom sheet with the rest of the daily screens, the
 * sidebar for older tools, and sign out. Items follow the role rules.
 */
const BottomNav = () => {
  const { user, removeSession } = useAuthContext();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const role = user?.role;
  const main = MAIN.filter((i) => canAccessSection(role, i.key));
  const more = MORE.filter((i) => canAccessSection(role, i.key));
  const moreActive = more.some((i) => pathname.startsWith(i.to));

  const openSidebar = () => {
    setOpen(false);
    document.querySelector('.button-toggle-menu')?.click();
  };

  return (
    <>
      <nav className="hd-bottom d-lg-none d-print-none" aria-label="Main">
        {main.map((i) => (
          <NavLink key={i.key} to={i.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <IconifyIcon icon={i.icon} className="hd-bottom-icon" aria-hidden="true" />
            <span>{i.label}</span>
          </NavLink>
        ))}
        <button type="button" className={moreActive || open ? 'active' : ''} aria-expanded={open} aria-controls="hd-more" onClick={() => setOpen(true)}>
          <IconifyIcon icon="solar:hamburger-menu-bold" className="hd-bottom-icon" aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
      <Offcanvas id="hd-more" show={open} onHide={() => setOpen(false)} placement="bottom" className="hd-sheet h-auto" aria-labelledby="hd-more-title">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title id="hd-more-title" as="h2" className="h5">More</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="pt-0">
          <ListGroup variant="flush">
            {more.map((i) => (
              <ListGroup.Item key={i.key} as={Link} to={i.to} action onClick={() => setOpen(false)} active={pathname.startsWith(i.to)}>
                <IconifyIcon icon={i.icon} aria-hidden="true" /> {i.label}
              </ListGroup.Item>
            ))}
            <ListGroup.Item as="button" type="button" action onClick={openSidebar}>
              <IconifyIcon icon="solar:widget-5-bold-duotone" aria-hidden="true" /> More tools
            </ListGroup.Item>
            <ListGroup.Item as="button" type="button" action onClick={() => { setOpen(false); removeSession(); }}>
              <IconifyIcon icon="solar:logout-2-bold-duotone" aria-hidden="true" /> Sign out
            </ListGroup.Item>
          </ListGroup>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default BottomNav;
