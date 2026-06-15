import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import PasswordFormInput from '@/components/form/PasswordFormInput';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Card, Col, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import * as yup from 'yup';
import { useAuthContext } from '@/context/useAuthContext';
import BrandSidePanel from '../../components/BrandSidePanel';
import AuthHeading from '../../components/AuthHeading';

const firstName = (n) => (n || '').trim().split(/\s+/)[0] || '';

const LockScreen = () => {
  const { user } = useAuthContext();
  const lockScreenSchema = yup.object({ password: yup.string().required('Please enter your password') });
  const { control, handleSubmit } = useForm({ resolver: yupResolver(lockScreenSchema) });
  const hi = firstName(user?.name);
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
                    kicker="HeritOS · locked"
                    title={hi ? `Welcome back${hi ? `, ${hi}` : ''}.` : 'Welcome back.'}
                    sub="Enter your password to unlock HeritOS and pick up where you left off."
                  />
                  <form className="authentication-form mb-5" onSubmit={handleSubmit(() => {})}>
                    <PasswordFormInput control={control} name="password" containerClassName="mb-3" placeholder="Enter your password" id="password-id" />
                    <div className="mb-1 text-center d-grid">
                      <Button variant="primary" type="submit">Unlock</Button>
                    </div>
                  </form>
                  <p className="text-muted text-center">
                    Not you?
                    <Link to="/auth/sign-in" className="fw-bold ms-1" style={{ color: 'var(--herit-primary)' }}>Sign in as another</Link>
                  </p>
                </div>
              </Col>
            </Row>
          </Col>
          <Col xxl={5} className="d-none d-xxl-flex">
            <Card className="h-100 mb-0 overflow-hidden border-0">
              <BrandSidePanel heading="Step away, step back." body="We held your place. The cutting table, today’s orders and your AI briefing are all where you left them." />
            </Card>
          </Col>
        </Row>
      </div>
    </div>;
};
export default LockScreen;
