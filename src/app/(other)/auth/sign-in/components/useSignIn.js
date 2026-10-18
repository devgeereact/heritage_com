import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';
import { useAuthContext } from '@/context/useAuthContext';
import { useNotificationContext } from '@/context/useNotificationContext';
import heritApi from '@/helpers/heritApi';
import { roleHome, canAccessPath } from '@/helpers/roles';
const useSignIn = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    saveSession
  } = useAuthContext();
  const [searchParams] = useSearchParams();
  const {
    showNotification
  } = useNotificationContext();
  const loginFormSchema = yup.object({
    email: yup.string().email('Please enter a valid email').required('Please enter your email'),
    password: yup.string().required('Please enter your password')
  });
  const {
    control,
    handleSubmit
  } = useForm({
    resolver: yupResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });
  const redirectUser = (role) => {
    const redirectLink = searchParams.get('redirectTo');
    // Honour redirectTo only if this role may open it; otherwise send them home.
    if (redirectLink && canAccessPath(role, redirectLink)) navigate(redirectLink);
    else navigate(roleHome(role));
  };
  const finishLogin = (res, okMsg) => {
    if (!res.token && !res.cookie_auth) return;
    // Flatten user fields to the top level so existing Larkon UI that reads
    // session.email / session.role keeps working, alongside session.user.
    // Under cookie auth (A15) the server kept the token in an HttpOnly cookie,
    // so only the profile is stored here.
    saveSession({
      ...(res.user ?? {}),
      user: res.user,
      ...(res.cookie_auth ? { cookie_auth: true } : { token: res.token })
    });
    redirectUser(res.user?.role);
    showNotification({
      message: okMsg,
      variant: 'success'
    });
  };
  const login = handleSubmit(async values => {
    setLoading(true);
    try {
      const res = await heritApi.login(values.email, values.password);
      finishLogin(res, 'Signed in to HeritOS. Redirecting...');
    } catch (e) {
      showNotification({
        message: e.message || 'Sign in failed',
        variant: 'danger'
      });
    } finally {
      setLoading(false);
    }
  });
  const [pin, setPin] = useState('');
  const pinLogin = async () => {
    setLoading(true);
    try {
      const res = await heritApi.pinLogin(pin);
      finishLogin(res, 'Signed in. Redirecting...');
    } catch (e) {
      showNotification({
        message: e.message || 'PIN sign in failed',
        variant: 'danger'
      });
    } finally {
      setLoading(false);
      setPin('');
    }
  };
  return {
    loading,
    login,
    control,
    pin,
    setPin,
    pinLogin
  };
};
export default useSignIn;