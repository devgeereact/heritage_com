import { Suspense } from 'react';
import Preloader from '@/components/Preloader';
import '@/assets/tokens/tokens.scss';
import '@/assets/scss/app.scss';
import '@/assets/scss/heritos-admin.css';

/** Sign-in and other staff pages without the admin chrome. Loads the admin CSS. */
const AuthLayout = ({ children }) => <Suspense fallback={<Preloader />}>{children}</Suspense>;

export default AuthLayout;
