import PageTItle from '@/components/PageTItle';
import PopularProfile from './components/PopularProfile';
import ProfileAbout from './components/ProfileAbout';
import ProfileMain from './components/ProfileMain';
const ProfilePage = () => {
  return <>
      <PageTItle title="Profile" />
      <ProfileMain />
      <ProfileAbout />
      <PopularProfile />
    </>;
};
export default ProfilePage;