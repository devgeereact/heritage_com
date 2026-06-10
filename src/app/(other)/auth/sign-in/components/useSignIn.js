import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';
import { useAuthContext } from '@/context/useAuthContext';
import { useNotificationContext } from '@/context/useNotificationContext';
import heritApi from '@/helpers/heritApi';
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
      email: 'dev@heritclothing.com',
      password: 'Testing123!'
    }
  });
  const redirectUser = () => {
    const redirectLink = searchParams.get('redirectTo');
    if (redirectLink) navigate(redirectLink);else navigate('/');
  };
  const login = handleSubmit(async values => {
    setLoading(true);
    try {
      const res = await heritApi.login(values.email, values.password);
      if (res.token) {
        // Flatten user fields to the top level so existing Larkon UI that reads
        // session.email / session.role keeps working, alongside session.user.
        saveSession({
          ...(res.user ?? {}),
          user: res.user,
          token: res.token
        });
        redirectUser();
        showNotification({
          message: 'Signed in to HeritOS. Redirecting...',
          variant: 'success'
        });
      }
    } catch (e) {
      showNotification({
        message: e.message || 'Sign in failed',
        variant: 'danger'
      });
    } finally {
      setLoading(false);
    }
  });
  return {
    loading,
    login,
    control
  };
};
export default useSignIn;