import React from 'react';
import ReactDOM from 'react-dom/client'; // Importa createRoot
import './index.css';
import './styles/ios.css';
import './styles/dataTable.module.css';
import './styles/mobile/dataTable.mobile.module.css';
import './styles/mobile/forms.mobile.css';
import './styles/mobile/navbar.mobile.css';
import './styles/mobile/dashboard.mobile.css';
import './styles/mobile/expenses.mobile.css';
import './styles/mobile/incomes.mobile.css';
import App from './App';
import { initIOSSupport, isIOS } from './utils/iosSupport';

// Inicializar suporte ao iOS
console.log('Initializing application, checking for iOS...');
initIOSSupport();

// Verificar se é um dispositivo iOS
const isIOSDevice = isIOS();
if (isIOSDevice) {
  console.log('iOS device detected, applying specific styles...');
  
  // Adicionar classes específicas para iOS
  document.documentElement.classList.add('ios-device');
  document.body.classList.add('ios-device');
  
  // Adicionar meta viewport com viewport-fit=cover para suporte a safe-area
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
  }
  
  // Forçar exibição da navbar em dispositivos iOS
  const navbarElement = document.querySelector('.mobileNavbar');
  if (navbarElement) {
    navbarElement.style.display = 'block';
    navbarElement.classList.add('ios-navbar');
    console.log('Forcing mobile navbar display for iOS device');
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);