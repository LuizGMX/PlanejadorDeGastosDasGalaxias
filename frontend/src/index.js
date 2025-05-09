import React from 'react';
import ReactDOM from 'react-dom/client'; // Importa createRoot
import './index.css';
import './styles/ios.css';
import './styles/variables.css';
import './styles/app.module.css';
import './styles/layout.module.css';
import './styles/sidebar.module.css';
import './styles/shared.module.css';
import './styles/dashboard.module.css';
import './styles/dataTable.module.css';
import './styles/addIncome.module.css';
import './styles/bankBalanceTrend.module.css';
import './styles/login.module.css';
import './styles/profile.module.css';
import './styles/telegramLinking.module.css';

// Estilos mobile
import './styles/mobile/dataTable.mobile.module.css';
import './styles/mobile/addIncomeAndExpense.mobile.module.css';
import './styles/mobile/incomes.mobile.css';
import './styles/mobile/expenses.mobile.css';
import './styles/mobile/navbar.mobile.css';
import './styles/mobile/forms.mobile.css';

import App from './App';
import { initIOSSupport, isIOS } from './utils/iosSupport';
import { checkApiHealth, diagnoseProblem } from './utils/apiHealth';

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

// Verificar se estamos em ambiente de produção
const isProduction = process.env.NODE_ENV === 'production';

// Função para verificar conectividade com API
const checkApiConnection = async () => {
  try {
    console.log('Verificando conectividade com a API...');
    const healthResult = await checkApiHealth();
    
    if (!healthResult.healthy) {
      const diagnosis = diagnoseProblem(healthResult);
      console.error('Problema de conectividade API:', diagnosis);
      
      // Em produção, podemos exibir um alerta ou uma mensagem mais amigável
      if (isProduction) {
        // Mostrar algum alerta no console, mas não interromper o carregamento
        console.warn('A aplicação pode enfrentar problemas de conectividade.');
      }
    } else {
      console.log('API está acessível e funcionando corretamente.');
    }
  } catch (error) {
    console.error('Erro ao verificar conectividade com API:', error);
  }
};

// Verificar conectividade antes de iniciar o aplicativo
checkApiConnection();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);