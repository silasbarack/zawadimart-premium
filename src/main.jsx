import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CatalogProvider } from './catalog';
import './styles.css';

// The app code has arrived: move the startup circle on (see index.html).
window.__zmBoot?.progress(0.45, 'Getting today\'s prices…');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <App />
      </CatalogProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
