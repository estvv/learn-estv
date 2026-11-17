import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initToolkits } from './toolkits';
import './index.css';

initToolkits();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
