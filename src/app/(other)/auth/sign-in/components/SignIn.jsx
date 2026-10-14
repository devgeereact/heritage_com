import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LoginFrom from './LoginFrom';
import PinLogin from './PinLogin';
import BrandSidePanel from '../../components/BrandSidePanel';
import AuthHeading from '../../components/AuthHeading';

const SignIn = () => {
  return (
    <div className="d-flex flex-column vh-100 p-3">
      <div className="d-flex flex-column flex-grow-1">
        <Row className="h-100">
          <Col xxl={7}>
            <Row className="justify-content-center h-100">
              <Col lg={6} className="py-lg-5">
                <div className="d-flex flex-column h-100 justify-content-center">
                  <div className="auth-logo mb-4">
                    <Link to="/dashboard" className="logo-dark">
                      <img src={logoDark} height={24} alt="logo dark" />
                    </Link>
                    <Link to="/dashboard" className="logo-light">
                      <img src={logoLight} height={24} alt="logo light" />
                    </Link>
                  </div>
                  <AuthHeading
                    kicker="HeritOS · sign in"
                    title="Welcome back."
                    sub="Sign in to run Herit Clothing: jobs, clients, appointments, payments and the website."
                  />
                  <div className="mb-3">
                    <LoginFrom />
                  </div>
                  <div className="mb-4">
                    <PinLogin />
                  </div>
                  <p className="text-muted text-center mb-0" style={{ fontSize: '0.85rem' }}>
                    <IconifyIcon icon="solar:lock-keyhole-minimalistic-bold" className="me-1" />
                    Staff access only. Need an account? Ask an administrator to add you under <strong>Team &amp; Access</strong>.
                  </p>
                </div>
              </Col>
            </Row>
          </Col>
          <Col xxl={5} className="d-none d-xxl-flex">
            <Card className="h-100 mb-0 overflow-hidden border-0">
              <BrandSidePanel />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default SignIn;
