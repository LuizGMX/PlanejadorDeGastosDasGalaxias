import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useState, createContext, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Expenses from './components/Expenses';
import AddExpense from './components/AddExpense';
import Profile from './components/Profile';

export const AuthContext = createContext();

function App() {
  const [auth, setAuth] = useState({ token: localStorage.getItem('token'), user: null });

  useEffect(() => {
    if (auth.token) {
      localStorage.setItem('token', auth.token);
    } else {
      localStorage.removeItem('token');
    }
  }, [auth.token]);

  const ProtectedRoute = ({ children }) => {
    return auth.token ? children : <Navigate to="/login" />;
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-expense"
            element={
              <ProtectedRoute>
                <AddExpense />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;