import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Expenses from './components/Expenses';
import AddExpense from './components/AddExpense';
import EditExpense from './components/EditExpense';
import Profile from './components/Profile';
import Income from './components/Income';
import AddIncome from './components/AddIncome';
import EditIncome from './components/EditIncome';
import SpreadsheetUpload from './components/SpreadsheetUpload';
import Layout from './components/Layout';
import EditRecurringIncomes from './components/EditRecurringIncomes';
import styles from './styles/app.module.css';
import './styles/navbar.mobile.css';
import { checkApiHealth, diagnoseProblem } from './utils/apiHealth';

export const AuthContext = React.createContext();

// Configurações do React Router v7
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    return { token, user: null, loading: !!token };
  });
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          console.log('Tentando buscar dados do usuário com token armazenado');
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          // Verificar se a resposta parece ser HTML (possível página de erro 502)
          const contentType = response.headers.get('content-type');
          const responseText = await response.text();
          
          // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
          if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
            console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
            console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
            
            // Não removemos o token para permitir novas tentativas quando o servidor voltar
            setAuth(prev => ({ ...prev, loading: false }));
            return;
          }
          
          if (response.ok) {
            try {
              // Parsear o JSON manualmente já que usamos text() acima
              const userData = JSON.parse(responseText);
              console.log('Dados do usuário recuperados com sucesso');
              
              setAuth({ 
                token: token, 
                user: userData, 
                loading: false 
              });
            } catch (jsonError) {
              console.error('Erro ao parsear JSON da resposta:', jsonError);
              console.error('Conteúdo da resposta:', responseText);
              setAuth(prev => ({ ...prev, loading: false }));
            }
          } else {
            console.error('Erro na resposta da API (status):', response.status);
            console.error('Conteúdo da resposta:', responseText);
            
            if (response.status === 401) {
              console.log('Token inválido ou expirado, removendo do localStorage');
              localStorage.removeItem('token');
              setAuth({ token: null, user: null, loading: false });
            } else {
              // Para outros erros, mantemos o token para permitir novas tentativas
              setAuth(prev => ({ ...prev, loading: false }));
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          // Verificamos se é problema de conexão (não remover token)
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            console.log('Possível problema de conexão. Mantendo token para novas tentativas.');
          }
          setAuth(prev => ({ ...prev, loading: false }));
        }
      } else {
        setAuth({ token: null, user: null, loading: false });
      }
    };

    fetchUser();
    
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          fetchUser();
        } else {
          setAuth({ token: null, user: null, loading: false });
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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

  const PrivateRoute = ({ children }) => {
    if (auth.loading) {
      return <div>Carregando...</div>;
    }
    
    return auth.token ? (
      <Layout>
        {children}
      </Layout>
    ) : (
      <Navigate to="/login" />
    );
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to={auth.token ? "/dashboard" : "/login"} />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/expenses" element={
            <PrivateRoute>
              <Expenses />
            </PrivateRoute>
          } />
          <Route path="/expenses/edit/:id" element={
            <PrivateRoute>
              <EditExpense />
            </PrivateRoute>
          } />
          <Route path="/add-expense" element={
            <PrivateRoute>
              <AddExpense />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/income" element={
            <PrivateRoute>
              <Income />
            </PrivateRoute>
          } />
          <Route path="/add-income" element={
            <PrivateRoute>
              <AddIncome />
            </PrivateRoute>
          } />
          <Route path="/incomes/edit/:id" element={
            <PrivateRoute>
              <EditIncome />
            </PrivateRoute>
          } />
          <Route path="/edit-recurring-incomes" element={
            <PrivateRoute>
              <EditRecurringIncomes />
            </PrivateRoute>
          } />
          <Route path="/upload-spreadsheet" element={
            <PrivateRoute>
              <SpreadsheetUpload />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to={auth.token ? "/dashboard" : "/login"} />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;