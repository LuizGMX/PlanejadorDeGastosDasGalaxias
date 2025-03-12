import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/sidebar.module.css';
import { BsGraphUp, BsListUl, BsPlusCircle, BsDoorOpen, BsCashCoin, BsCashStack } from 'react-icons/bs';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, setAuth } = useContext(AuthContext);

  const handleLogout = () => {
    setAuth({ token: null, user: null });
    navigate('/login');
  };

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <BsGraphUp size={20} />
    },
    {
      label: 'Lista de Despesas',
      path: '/expenses',
      icon: <BsListUl size={20} />
    },
    {
      label: 'Adicionar Despesa',
      path: '/add-expense',
      icon: <BsPlusCircle size={20} />
    },
    {
      label: 'Lista de Receitas',
      path: '/income',
      icon: <BsCashCoin size={20} />
    },
    {
      label: 'Adicionar Receita',
      path: '/add-income',
      icon: <BsCashStack size={20} />
    }
  ];

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <h2>PGG</h2>
        <p>Planejador de Gastos das Galáxias</p>
      </div>

      <nav className={styles.menu}>
        {menuItems.map((item) => (
          <button
            key={item.path}
            className={`${styles.menuItem} ${location.pathname === item.path ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className={styles.icon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <button className={styles.logoutButton} onClick={handleLogout}>
        <span className={styles.icon}><BsDoorOpen size={20} /></span>
        Sair
      </button>
    </div>
  );
};

export default Sidebar; 