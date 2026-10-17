import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import { Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import BrandSidePanel from '../../components/BrandSidePanel';
import AuthHeading from '../../components/AuthHeading';

const ResetPassword = () => {
  return <div className="d-flex flex-column vh-100 p-3">
      <div className="d-flex flex-column flex-grow-1">
        <Row className="h-100">
          <Col xxl={7}>
            <Row className="justify-content-center h-100">
              <Col lg={6} className="py-lg-5">
                <div className="d-flex flex-column h-100 justify-content-center">
                  <div className="auth-logo mb-4">
                    <Link to="/auth/sign-in" className="logo-dark"><img src={logoDark} height={24} alt="HeritOS sign in" /></Link>
                    <Link to="/auth/sign-in" className="logo-light"><img src={logoLight} height={24} alt="HeritOS sign in" /></Link>
                  </div>
                  {/* No email reset exists yet (K-04): say so plainly instead of a form that sends nothing. */}
                  <AuthHeading
                    kicker="HeritOS · reset"
                    title="Lost your password?"
                    sub="Password reset by email is not available yet."
                  />
                  <p>
                    Staff: ask the owner to reset your password from the Team page. They will give you a temporary password.
                  </p>
                  <p className="text-muted">
                    Owner: if you are locked out, the developer can reset the owner password on the server.
                  </p>
                  <p className="mt-5 text-muted text-center">
                    Back to
                    <Link to="/auth/sign-in" className="fw-bold ms-1" style={{ color: 'var(--herit-primary)' }}>Sign in</Link>
                  </p>
                </div>
              </Col>
            </Row>
          </Col>
          <Col xxl={5} className="d-none d-xxl-flex">
            <Card className="h-100 mb-0 overflow-hidden border-0">
              <BrandSidePanel heading="Back to the workroom." />
            </Card>
          </Col>
        </Row>
      </div>
    </div>;
};
export default ResetPassword;
