import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Expenses from './components/Expenses';
import AddExpense from './components/AddExpense';
import Profile from './components/Profile';
import Income from './components/Income';
import AddIncome from './components/AddIncome';
import SpreadsheetUpload from './components/SpreadsheetUpload';
import Sidebar from './components/Sidebar';
import styles from './styles/app.module.css';

export const AuthContext = React.createContext();

function App() {
  const [auth, setAuth] = useState({ token: localStorage.getItem('token'), user: null });

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.token) {
        try {
          const response = await fetch('http://localhost:5000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setAuth(prev => ({ ...prev, user: userData }));
          } else {
            localStorage.removeItem('token');
            setAuth({ token: null, user: null });
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          localStorage.removeItem('token');
          setAuth({ token: null, user: null });
        }
      }
    };

    fetchUser();
  }, [auth.token]);

  const PrivateRoute = ({ children }) => {
    return auth.token ? (
      <div className={styles.appContainer}>
        <Sidebar />
        <div className={styles.mainContent}>
          {children}
        </div>
      </div>
    ) : (
      <Navigate to="/login" />
    );
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      <Router>
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