import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { basePath } from './context/constants.js';
import { BrowserRouter } from 'react-router-dom';
createRoot(document.getElementById('root')).render(<StrictMode>
    <BrowserRouter basename={basePath}>
      <App />
    </BrowserRouter>
  </StrictMode>);