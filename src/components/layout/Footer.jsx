import { Col, Container, Row } from 'react-bootstrap';
const Footer = () => {
  return <footer className="footer">
      <Container fluid>
        <Row>
          <Col xs={12} className="text-center">
            © {new Date().getFullYear()} Herit Clothing · HeritOS · Ajuwon Market, Lagos
          </Col>
        </Row>
      </Container>
    </footer>;
};
export default Footer;