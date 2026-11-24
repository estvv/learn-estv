import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAppearance } from './lib/appearance';
import { initToolkits } from './toolkits';
import './index.css';
import './dark.css';

initAppearance();
initToolkits();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
