import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import TextFormInput from '@/components/form/TextFormInput';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Card, Col, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import * as yup from 'yup';
import BrandSidePanel from '../../components/BrandSidePanel';
import AuthHeading from '../../components/AuthHeading';

const ResetPassword = () => {
  const resetPasswordSchema = yup.object({
    email: yup.string().email('Please enter a valid email').required('please enter your email')
  });
  const { control, handleSubmit } = useForm({ resolver: yupResolver(resetPasswordSchema) });
  return <div className="d-flex flex-column vh-100 p-3">
      <div className="d-flex flex-column flex-grow-1">
        <Row className="h-100">
          <Col xxl={7}>
            <Row className="justify-content-center h-100">
              <Col lg={6} className="py-lg-5">
                <div className="d-flex flex-column h-100 justify-content-center">
                  <div className="auth-logo mb-4">
                    <Link to="/dashboard" className="logo-dark"><img src={logoDark} height={24} alt="logo dark" /></Link>
                    <Link to="/dashboard" className="logo-light"><img src={logoLight} height={24} alt="logo light" /></Link>
                  </div>
                  <AuthHeading
                    kicker="HeritOS · reset"
                    title="Lost your key?"
                    sub="Enter your email and we’ll send instructions to reset your password. The link is short-lived for safety."
                  />
                  <form className="authentication-form" onSubmit={handleSubmit(() => {})}>
                    <TextFormInput control={control} name="email" containerClassName="mb-3" label="Email" id="email-id" placeholder="Enter your email" />
                    <div className="mb-1 text-center d-grid">
                      <Button variant="primary" type="submit">Send reset link</Button>
                    </div>
                  </form>
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
