import { Col, Container, Row } from 'react-bootstrap';
import IconifyIcon from '../wrappers/IconifyIcon';
const Footer = () => {
  return <footer className="footer">
      <Container fluid>
        <Row>
          <Col xs={12} className="text-center">
            © {new Date().getFullYear()} Herit Clothing · HeritOS{' '}
            <IconifyIcon icon="iconamoon:heart-duotone" className="fs-18 align-middle text-danger" />{' '}
            Lagos, Nigeria
          </Col>
        </Row>
      </Container>
    </footer>;
};
export default Footer;