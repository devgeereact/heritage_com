import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.jsx';
import { basePath } from './context/constants.js';
import { CLERK_KEY, clerkEnabled } from './helpers/clerk.js';
import { BrowserRouter } from 'react-router-dom';
const tree = <BrowserRouter basename={basePath}>
      <App />
    </BrowserRouter>;
createRoot(document.getElementById('root')).render(<StrictMode>
    {clerkEnabled ? <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/auth/sign-in">{tree}</ClerkProvider> : tree}
  </StrictMode>);