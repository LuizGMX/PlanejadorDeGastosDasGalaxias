import React from 'react';
import ReactDOM from 'react-dom/client'; // Importa createRoot
import './index.css';
import './styles/ios.css';
import App from './App';
import initIOSFixes from './utils/ios-fixes';

// Initialize iOS fixes
initIOSFixes();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);