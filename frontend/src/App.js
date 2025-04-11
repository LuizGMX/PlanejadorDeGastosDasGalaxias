import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { checkApiHealth, diagnoseProblem } from './utils/apiHealth';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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
        <div className={`app ${isIOSDevice ? 'ios-device' : ''}`}>
          {/* Renderiza Sidebar para desktop e MobileNavbar para mobile */}
          {isMobile ? <MobileNavbar /> : <Sidebar />}
          
          <div className={`mainContent ${isMobile ? 'mobile' : ''}`}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={
                <>
                  <SubscriptionStatus />
                  <Dashboard />
                </>
              } />
              <Route path="/expenses" element={
                <Layout>
                  <ExpensesWrapper />
                </Layout>
              } />
              <Route path="/expenses/edit/:id" element={
                <Layout>
                  <EditExpense />
                </Layout>
              } />
              <Route path="/add-expense" element={
                <Layout>
                  <AddExpenseWrapper />
                </Layout>
              } />
              <Route path="/profile" element={
                <Layout>
                  <Profile />
                </Layout>
              } />
              <Route path="/income" element={
                <Layout>
                  <IncomesWrapper />
                </Layout>
              } />
              <Route path="/add-income" element={
                <Layout>
                  <AddIncomeWrapper />
                </Layout>
              } />
              <Route path="/incomes/edit/:id" element={
                <Layout>
                  <EditIncome />
                </Layout>
              } />
              <Route path="/edit-recurring-incomes" element={
                <Layout>
                  <EditRecurringIncomes />
                </Layout>
              } />
              <Route path="/upload-spreadsheet" element={
                <Layout>
                  <SpreadsheetUpload />
                </Layout>
              } />
              <Route path="/payment" element={
                <Layout>
                  <Payment />
                </Layout>
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