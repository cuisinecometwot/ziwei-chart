import React from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/app.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Không tìm thấy phần tử #root');

createRoot(rootEl).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);