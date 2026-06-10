import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import smallImg from '@/assets/images/small/img-10.jpg';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, Col, Row } from 'react-bootstrap';
import SignUpForm from './SignUpForm';
import { Link } from 'react-router-dom';
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
                  <h2 className="fw-bold fs-24">Sign Up</h2>
                  <p className="text-muted mt-1 mb-3">New to our platform? Sign up now! It only takes a minute</p>
                  <div>
                    <SignUpForm />
                    <p className="mt-3 fw-semibold no-span">OR sign with</p>
                    <div className="d-grid gap-2 mb-2">
                      <Link to="" className="btn btn-soft-dark">
                        <IconifyIcon icon="bxl:google" className="fs-20 me-1" /> Sign Up with Google
                      </Link>
                      <Link to="" className="btn btn-soft-primary">
                        <IconifyIcon icon="bxl:facebook" className="fs-20 me-1" /> Sign Up with Facebook
                      </Link>
                    </div>
                  </div>
                  <p className="mt-auto text-danger text-center">
                    I already have an account{' '}
                    <Link to="/auth/sign-in" className="text-dark fw-bold ms-1">
                      Sign In
                    </Link>
                  </p>
                </div>
              </Col>
            </Row>
          </Col>
          <Col xxl={5} className="d-none d-xxl-flex">
            <Card className="h-100 mb-0 overflow-hidden">
              <div className="d-flex flex-column h-100">
                <img src={smallImg} height={867} width={759} alt="small-img" className="w-100 h-100" />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>;
};
export default SignUp;