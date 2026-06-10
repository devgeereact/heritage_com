import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import maintenanceImg from '@/assets/images/maintenance-2.png';
import smallImg from '@/assets/images/small/img-10.jpg';
import { Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
const Maintenance = () => {
  return <div className="d-flex flex-column vh-100 p-3">
      <div className="d-flex flex-column flex-grow-1">
        <Row className="h-100">
          <Col xxl={7}>
            <Row className="align-items-center justify-content-center h-100">
              <Col lg={10}>
                <div className="auth-logo mb-3 text-center">
                  <Link to="/dashboard" className="logo-dark">
                    <img src={logoDark} height={24} alt="logo dark" />
                  </Link>
                  <Link to="/dashboard" className="logo-light">
                    <img src={logoLight} height={24} alt="logo light" />
                  </Link>
                </div>
                <div className="mx-auto text-center">
                  <img src={maintenanceImg} alt="maintenance" className="img-fluid my-3" height={700} width={700} />
                </div>
                <h2 className="fw-bold text-center lh-base">We are currently performing maintenance</h2>
                <p className="text-muted text-center mt-1 mb-4">We&apos;re making the system more awesome. We&apos;ll be back shortly.</p>
                <div className="text-center">
                  <Link to="/dashboard" className="btn btn-primary">
                    Back To Home
                  </Link>
                </div>
              </Col>
            </Row>
          </Col>
          <Col xxl={5} className="d-none d-xxl-flex">
            <Card className="h-100 mb-0 overflow-hidden">
              <div className="d-flex flex-column h-100">
                <img src={smallImg} alt="smallImg" className="w-100 h-100" />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>;
};
export default Maintenance;