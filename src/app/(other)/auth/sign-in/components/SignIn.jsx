import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LoginFrom from './LoginFrom';
import PinLogin from './PinLogin';

// Branded heritage panel — Ankara-style wax-print woven from gradients, so the
// sign-in is on-brand with no stock photo and nothing to load.
const fabricPanel = {
  backgroundColor: '#7f1d1d',
  backgroundImage: [
    'radial-gradient(circle at 50% 50%, rgba(254,243,199,0.9) 3%, transparent 4%)',
    'radial-gradient(circle at 50% 50%, transparent 11%, rgba(180,83,9,0.85) 12%, rgba(180,83,9,0.85) 16%, transparent 17%)',
    'radial-gradient(circle at 50% 50%, transparent 21%, rgba(253,242,214,0.7) 22%, rgba(253,242,214,0.7) 25%, transparent 26%)',
    'radial-gradient(circle at 0% 0%, transparent 21%, rgba(180,83,9,0.7) 22%, transparent 26%)',
    'radial-gradient(circle at 100% 100%, transparent 21%, rgba(180,83,9,0.7) 22%, transparent 26%)',
  ].join(','),
  backgroundSize: '64px 64px',
};

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
                  <h2 className="fw-bold fs-24">Welcome back</h2>
                  <p className="text-muted mt-1 mb-4">Sign in to HeritOS — the operating system behind Herit Clothing.</p>
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
              <div className="d-flex flex-column h-100 justify-content-between p-5"
                   style={{ ...fabricPanel, color: '#fff', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, rgba(28,25,23,0.55), rgba(28,25,23,0.88))' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.72rem', letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.85 }}>
                    Herit Clothing · Est. Lagos
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <h1 style={{ fontFamily: '"Libre Baskerville", Georgia, serif', fontWeight: 700, fontStyle: 'italic', fontSize: '2.4rem', lineHeight: 1.15, color: '#fff' }}>
                    Wear your heritage.
                  </h1>
                  <p style={{ marginTop: '1rem', maxWidth: '24rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>
                    One place to run the brand — tailoring, catalogue, orders, stock, customers,
                    finance and more. Made in Ajuwon Market, for the world.
                  </p>
                </div>
                <div style={{ position: 'relative', fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconifyIcon icon="solar:map-point-bold" /> Lagos, Nigeria
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default SignIn;
