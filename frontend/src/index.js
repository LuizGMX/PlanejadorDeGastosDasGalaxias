import React from 'react';
import ReactDOM from 'react-dom/client'; // Importa createRoot
import './index.css';
import './styles/ios.css';
import './styles/mobile/dataTable.mobile.css';
import './styles/mobile/forms.mobile.css';
import './styles/mobile/navbar.mobile.css';
import App from './App';
import { initIOSSupport, isIOS } from './utils/iosSupport';

// Initialize iOS support
console.log('Initializing application, checking for iOS...');
initIOSSupport();

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