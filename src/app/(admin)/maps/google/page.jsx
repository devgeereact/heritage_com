import PageTItle from '@/components/PageTItle';
import { Container } from 'react-bootstrap';
import AllGoogleMaps from './components/AllGoogleMaps';
const GoogleMaps = () => {
  return <>
      <PageTItle title="Google Maps" />
      <Container>
        <AllGoogleMaps />
      </Container>
    </>;
};
export default GoogleMaps;