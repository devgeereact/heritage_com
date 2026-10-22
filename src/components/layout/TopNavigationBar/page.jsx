import { Suspense } from 'react';
import CommandPalette from './components/CommandPalette';
import LeftSideBarToggle from './components/LeftSideBarToggle';
import Notifications from './components/Notifications';
import ProfileDropdown from './components/ProfileDropdown';
import ThemeModeToggle from './components/ThemeModeToggle';
import TopBarTitle from './components/TopBarTitle';
const page = () => {
  return <header className="topbar">
      <div className="container-fluid">
        <div className="navbar-header">
          <div className="d-flex align-items-center">
            <LeftSideBarToggle />
            <TopBarTitle />
          </div>
          <div className="d-flex align-items-center gap-1">
            <ThemeModeToggle />

            <Suspense>
              <Notifications />
            </Suspense>

            <ProfileDropdown />
            <CommandPalette />
          </div>
        </div>
      </div>
    </header>;
};
export default page;