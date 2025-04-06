import React from 'react';
import ReactDOM from 'react-dom/client'; // Importa createRoot
import './index.css';
import './styles/ios.css';
import App from './App';
import { initIOSFixes, isIOS } from './utils/ios-fixes';

// Initialize iOS fixes
console.log('Initializing application, checking for iOS...');
initIOSFixes();

// Log iOS detection after a small delay to ensure DOM is loaded
setTimeout(() => {
  const isIOSDevice = isIOS();
  console.log('iOS device detected:', isIOSDevice);
  if (isIOSDevice) {
    // Add iOS class to html element as well for better CSS targeting
    document.documentElement.classList.add('ios-device');
  }
}, 200);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);