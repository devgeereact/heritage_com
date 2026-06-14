import { useState } from 'react';
import { Button, Collapse, InputGroup, Form } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import useSignIn from './useSignIn';

// Quick PIN unlock for a shared market-stall device — staff tap their PIN
// instead of typing email + password. Backed by /auth.php?action=pin_login.
const PinLogin = () => {
  const { pin, setPin, pinLogin, loading } = useSignIn();
  const [open, setOpen] = useState(false);

  return (
    <div className="text-center">
      <button type="button" className="btn btn-link btn-sm text-decoration-none" onClick={() => setOpen((o) => !o)}>
        <IconifyIcon icon="solar:posts-carousel-horizontal-bold" className="me-1" />
        {open ? 'Use email & password' : 'Sign in with staff PIN'}
      </button>
      <Collapse in={open}>
        <div>
          <InputGroup className="mt-2">
            <Form.Control
              type="password" inputMode="numeric" maxLength={6} placeholder="4–6 digit PIN"
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter' && pin.length >= 4) pinLogin(); }}
              style={{ textAlign: 'center', letterSpacing: '0.4em' }}
            />
            <Button variant="primary" onClick={pinLogin} disabled={loading || pin.length < 4}>
              Unlock
            </Button>
          </InputGroup>
        </div>
      </Collapse>
    </div>
  );
};

export default PinLogin;
