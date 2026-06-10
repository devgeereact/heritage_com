import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import smallImg from '@/assets/images/small/img-10.jpg';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LoginFrom from './LoginFrom';
const SignIn = () => {
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
                  <h2 className="fw-bold fs-24">Sign In</h2>
                  <p className="text-muted mt-1 mb-4">Enter your email address and password to access admin panel.</p>
                  <div className="mb-5">
                    <LoginFrom />
                    <p className="mt-3 fw-semibold no-span">OR sign with</p>
                    <div className="d-grid gap-2">
                      <Link to="" className="btn btn-soft-dark">
                        <IconifyIcon icon="bxl:google" className="fs-20 me-1" /> Sign in with Google
                      </Link>
                      <Link to="" className="btn btn-soft-primary">
                        <IconifyIcon icon="bxl:facebook" className="fs-20 me-1" /> Sign in with Facebook
                      </Link>
                    </div>
                  </div>
                  <p className="text-danger text-center">
                    Don&apos;t have an account?{' '}
                    <Link to="/auth/sign-up" className="text-dark fw-bold ms-1">
                      Sign Up
                    </Link>
                  </p>
                </div>
              </Col>
            </Row>
          </Col>
          <Col xxl={5} className="d-none d-xxl-flex">
            <Card className="h-100 mb-0 overflow-hidden">
              <div className="d-flex flex-column h-100">
                <img src={smallImg} alt="small-img" className="w-100 h-100" />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>;
};
export default SignIn;