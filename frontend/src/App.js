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
          
          if (response.ok) {
            const userData = await response.json();
            console.log('Dados do usuário recuperados com sucesso');
            
            setAuth({ 
              token: token, 
              user: userData, 
              loading: false 
            });
          } else {
            console.error('Erro na resposta da API:', await response.text());
            if (response.status === 401) {
              console.log('Token inválido ou expirado, removendo do localStorage');
              localStorage.removeItem('token');
              setAuth({ token: null, user: null, loading: false });
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
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