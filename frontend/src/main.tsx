import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/instrument-sans';
import '@fontsource-variable/instrument-sans/wght-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import 'remixicon/fonts/remixicon.css';
import './index.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Application root was not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
