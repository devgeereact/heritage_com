import PageTitle from '@/components/PageTitle';
import { Container } from 'react-bootstrap';
import AllGoogleMaps from './components/AllGoogleMaps';
const GoogleMaps = () => {
  return <>
      <PageTitle title="Google Maps" />
      <Container>
        <AllGoogleMaps />
      </Container>
    </>;
};
export default GoogleMaps;