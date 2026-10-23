import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CatalogProvider } from './catalog';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <App />
      </CatalogProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
