import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, Col, Row } from 'react-bootstrap';
import SignUpForm from './SignUpForm';
import { Link } from 'react-router-dom';
import BrandSidePanel from '../../components/BrandSidePanel';
import AuthHeading from '../../components/AuthHeading';

const SignUp = () => {
  return <div className="d-flex flex-column vh-100 p-3">
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
                    kicker="HeritOS · sign up"
                    title="Join the workshop."
                    sub="Create your HeritOS account. Access is granted by an administrator under Team & Access."
                  />
                  <div>
                    <SignUpForm />
                    <p className="mt-3 fw-semibold no-span">Or continue with</p>
                    <div className="d-grid gap-2 mb-2">
                      <Link to="" className="btn btn-soft-dark">
                        <IconifyIcon icon="bxl:google" className="fs-20 me-1" /> Sign up with Google
                      </Link>
                      <Link to="" className="btn btn-soft-primary">
                        <IconifyIcon icon="bxl:facebook" className="fs-20 me-1" /> Sign up with Facebook
                      </Link>
                    </div>
                  </div>
                  <p className="mt-auto text-muted text-center">
                    Already have an account?
                    <Link to="/auth/sign-in" className="fw-bold ms-1" style={{ color: 'var(--herit-primary)' }}>
                      Sign in
                    </Link>
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
    </div>;
};
export default SignUp;