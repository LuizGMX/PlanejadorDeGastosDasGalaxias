import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';

const LogoutButton = () => {
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuth({ token: null });
    navigate('/login');
  };

  return (
    <button 
      onClick={handleLogout}
      className={styles.logoutButton}
      title="Sair"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        width="24" 
        height="24"
      >
        <path d="M16 13v-2H7V8l-5 4 5 4v-3z"/>
        <path d="M20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>
  );
};

export default LogoutButton; 