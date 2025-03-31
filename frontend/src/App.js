import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Expenses from './components/Expenses';
import AddExpense from './components/AddExpense';
import Profile from './components/Profile';
import Income from './components/Income';
import AddIncome from './components/AddIncome';
import SpreadsheetUpload from './components/SpreadsheetUpload';
import Layout from './components/Layout';
import EditRecurringExpenses from './components/EditRecurringExpenses';
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
      if (auth.token && auth.loading) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setAuth(prev => ({ ...prev, user: userData, loading: false }));
          } else {
            console.error('Erro na resposta da API:', await response.text());
            localStorage.removeItem('token');
            setAuth({ token: null, user: null, loading: false });
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          localStorage.removeItem('token');
          setAuth({ token: null, user: null, loading: false });
        }
      } else if (!auth.token) {
        setAuth(prev => ({ ...prev, loading: false }));
      }
    };

    fetchUser();
  }, [auth.token]);

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
          <Route path="/edit-recurring-expenses" element={
            <PrivateRoute>
              <EditRecurringExpenses />
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