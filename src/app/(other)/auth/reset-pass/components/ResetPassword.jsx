import { useState } from 'react';
import logoDark from '@/assets/images/logo-dark.svg';
import logoLight from '@/assets/images/logo-light.svg';
import TextFormInput from '@/components/form/TextFormInput';
import PasswordFormInput from '@/components/form/PasswordFormInput';
import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Card, Col, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';
import heritApi from '@/helpers/heritApi';
import BrandSidePanel from '../../components/BrandSidePanel';
import AuthHeading from '../../components/AuthHeading';

const requestSchema = yup.object({
  email: yup.string().email('Enter a valid email address').required('Enter the email address you sign in with'),
});
const confirmSchema = yup.object({
  password: yup.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters').required('Choose a new password'),
  confirm: yup.string().oneOf([yup.ref('password')], 'The two passwords do not match').required('Type the new password again'),
});

/** Step 1: ask for a link by email. The answer is the same whether or not the address has an account. */
const RequestForm = () => {
  const { control, handleSubmit } = useForm({ resolver: yupResolver(requestSchema) });
  const [state, setState] = useState({ busy: false, done: '', error: '' });
  const submit = handleSubmit(async ({ email }) => {
    setState({ busy: true, done: '', error: '' });
    try {
      const r = await heritApi.resetRequest(email.trim());
      setState({ busy: false, done: r?.message || 'If that address has an account, a reset link is on its way.', error: '' });
    } catch (e) {
      setState({ busy: false, done: '', error: e.message || 'The request could not be sent. Try again.' });
    }
  });
  if (state.done) {
    return <Alert variant="success" role="status" className="mb-0">{state.done}</Alert>;
  }
  return (
    <form className="authentication-form" onSubmit={submit} noValidate>
      <TextFormInput control={control} name="email" type="email" autoComplete="email" containerClassName="mb-3" label="Email" id="email-id" placeholder="you@heritclothing.com" />
      {state.error && <Alert variant="danger" role="alert">{state.error}</Alert>}
      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send reset link'}</Button>
      </div>
    </form>
  );
};

/** Step 2: from the emailed link, choose a new password. */
const ConfirmForm = ({ token }) => {
  const { control, handleSubmit } = useForm({ resolver: yupResolver(confirmSchema) });
  const [state, setState] = useState({ busy: false, done: '', error: '' });
  const submit = handleSubmit(async ({ password }) => {
    setState({ busy: true, done: '', error: '' });
    try {
      const r = await heritApi.resetConfirm(token, password);
      setState({ busy: false, done: r?.message || 'Your password has changed.', error: '' });
    } catch (e) {
      setState({ busy: false, done: '', error: e.message || 'The password could not be changed. Try again.' });
    }
  });
  if (state.done) {
    return (
      <>
        <Alert variant="success" role="status">{state.done}</Alert>
        <div className="d-grid"><Link to="/auth/sign-in" className="btn btn-primary">Sign in</Link></div>
      </>
    );
  }
  return (
    <form className="authentication-form" onSubmit={submit} noValidate>
      <PasswordFormInput control={control} name="password" autoComplete="new-password" containerClassName="mb-3" label="New password" id="new-password" placeholder="At least 8 characters" />
      <PasswordFormInput control={control} name="confirm" autoComplete="new-password" containerClassName="mb-3" label="New password again" id="confirm-password" />
      {state.error && (
        <Alert variant="danger" role="alert">
          {state.error} <Link to="/auth/reset-pass">Ask for a new link</Link>
        </Alert>
      )}
      <div className="mb-1 text-center d-grid">
        <Button variant="primary" type="submit" disabled={state.busy}>{state.busy ? 'Saving…' : 'Save new password'}</Button>
      </div>
    </form>
  );
};

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  return <div className="d-flex flex-column vh-100 p-3">
      <div className="d-flex flex-column flex-grow-1">
        <Row className="h-100">
          <Col xxl={7}>
            <Row className="justify-content-center h-100">
              <Col lg={6} className="py-lg-5">
                <div className="d-flex flex-column h-100 justify-content-center">
                  <div className="auth-logo mb-4">
                    <Link to="/today" className="logo-dark"><img src={logoDark} height={24} alt="Herit Clothing" /></Link>
                    <Link to="/today" className="logo-light"><img src={logoLight} height={24} alt="Herit Clothing" /></Link>
                  </div>
                  {token ? (
                    <>
                      <AuthHeading kicker="HeritOS · reset" title="Choose a new password" sub="This signs you out on every device. Then sign in with the new password." />
                      <ConfirmForm token={token} />
                    </>
                  ) : (
                    <>
                      <AuthHeading kicker="HeritOS · reset" title="Lost your key?" sub="Enter the email you sign in with. We send a link that works once and expires in 30 minutes." />
                      <RequestForm />
                    </>
                  )}
                  <p className="mt-5 text-muted text-center">
                    Back to
                    <Link to="/auth/sign-in" className="fw-bold ms-1">Sign in</Link>
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
