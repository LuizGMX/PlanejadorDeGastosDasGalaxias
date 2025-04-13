import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/auth/Login';

import Dashboard from './components/dashboard/Dashboard';
import SubscriptionStatus from './components/payment/SubscriptionStatus';
import ExpensesWrapper from './components/expenses/ExpensesWrapper';
import AddExpenseWrapper from './components/expenses/AddExpenseWrapper';
import EditExpense from './components/expenses/EditExpense';
import Profile from './components/profile/Profile';
import IncomesWrapper from './components/incomes/IncomesWrapper';
import AddIncomeWrapper from './components/incomes/AddIncomeWrapper';
import EditIncome from './components/incomes/EditIncome';
import SpreadsheetUpload from './components/spreadsheet/SpreadsheetUpload';
import Layout from './components/layout/Layout';
import EditRecurringIncomes from './components/incomes/EditRecurringIncomes';
import Payment from './components/payment/Payment';
import PaymentResult from './components/payment/PaymentResult';
import ProtectedRoute from './components/ProtectedRoute';
import { checkApiHealth, diagnoseProblem } from './utils/apiHealth';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { initIOSSupport, isIOS } from './utils/iosSupport';
import MobileNavbar from './components/layout/MobileNavbar';
import Sidebar from './components/layout/Sidebar';
import './styles/ios.css';

// Configurações do React Router v7
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

// Componente para renderizar barras de navegação com base no estado de autenticação
const Navigation = ({ setHasSidebar }) => {
  const { auth } = useContext(AuthContext);
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apenas renderizar os componentes de navegação se o usuário estiver logado
  // E não estiver na página de login
  if (!auth.token || location.pathname === '/login') {
    setHasSidebar(false);
    return null;
  }

  setHasSidebar(!isMobile);
  return isMobile ? <MobileNavbar /> : <Sidebar />;
};

function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hasSidebar, setHasSidebar] = useState(false);

  // Verificar a saúde da API ao iniciar o aplicativo
  useEffect(() => {
    async function checkHealth() {
      try {
        const healthResult = await checkApiHealth();
        setApiStatus(healthResult);
        
        if (!healthResult.healthy) {
          console.error('API não está saudável:', healthResult);
          const diagnosis = diagnoseProblem(healthResult);
          console.log('Diagnóstico do problema:', diagnosis);
        }
      } catch (error) {
        console.error('Erro ao verificar saúde da API:', error);
        setApiStatus({ healthy: false, error: error.message });
      }
    }
    
    checkHealth();
  }, []);

  useEffect(() => {
    // Inicializar suporte ao iOS
    initIOSSupport();
    
    // Verificar se é um dispositivo iOS
    const isIOSDevice = isIOS();
    setIsIOSDevice(isIOSDevice);
    
    // Adicionar classes específicas para iOS
    if (isIOSDevice) {
      document.documentElement.classList.add('ios-device');
      document.body.classList.add('ios-device');
      
      // Adicionar meta viewport com viewport-fit=cover para suporte a safe-area
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AuthProvider>
      <Router {...routerConfig}>
        <Toaster position="top-right" />
        {/* Banner de aviso quando a API não está disponível */}
        {apiStatus && !apiStatus.healthy && (
          <div style={{
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            backgroundColor: '#f44336', 
            color: 'white', 
            padding: '10px', 
            textAlign: 'center', 
            zIndex: 9999
          }}>
            Erro de conexão com o servidor. Algumas funcionalidades podem não estar disponíveis. 
            {apiStatus.error && ` Erro: ${apiStatus.error}`}
          </div>
        )}
        <div className={`app ${isIOSDevice ? 'ios-device' : ''} ${hasSidebar ? 'with-sidebar' : ''}`}>
          {/* Renderização condicional da navegação baseada em autenticação */}
          <Navigation setHasSidebar={setHasSidebar} />
          
          <div className={`mainContent ${isMobile ? 'mobile' : ''}`}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
              
              {/* Rotas protegidas que exigem assinatura ativa */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <SubscriptionStatus />
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/expenses" element={
                <ProtectedRoute>
                  <Layout>
                    <ExpensesWrapper />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/expenses/edit/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <EditExpense />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/add-expense" element={
                <ProtectedRoute>
                  <Layout>
                    <AddExpenseWrapper />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute allowWithoutSubscription={true}>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/income" element={
                <ProtectedRoute>
                  <Layout>
                    <IncomesWrapper />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/add-income" element={
                <ProtectedRoute>
                  <Layout>
                    <AddIncomeWrapper />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/incomes/edit/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <EditIncome />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/edit-recurring-incomes" element={
                <ProtectedRoute>
                  <Layout>
                    <EditRecurringIncomes />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/upload-spreadsheet" element={
                <ProtectedRoute>
                  <Layout>
                    <SpreadsheetUpload />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Rotas relacionadas a pagamento são acessíveis mesmo sem assinatura ativa */}
              <Route path="/payment" element={
                <ProtectedRoute allowWithoutSubscription={true}>
                  <Layout>
                    <Payment />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/payment/success" element={
                <ProtectedRoute allowWithoutSubscription={true}>
                  <Layout>
                    <PaymentResult />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/payment/failure" element={
                <ProtectedRoute allowWithoutSubscription={true}>
                  <Layout>
                    <PaymentResult />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/payment/pending" element={
                <ProtectedRoute allowWithoutSubscription={true}>
                  <Layout>
                    <PaymentResult />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;