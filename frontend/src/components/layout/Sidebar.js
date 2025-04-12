import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import styles from '../../styles/sidebar.module.css';
import { BsGraphUp, BsListUl, BsPlusCircle, BsDoorOpen, BsCashCoin, BsChevronDown, BsPerson, BsPencil } from 'react-icons/bs';
import logo from '../../assets/logo.svg';
import { GiPayMoney, GiReceiveMoney, } from "react-icons/gi";

const Sidebar = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, setAuth } = useContext(AuthContext);
  const [openMenu, setOpenMenu] = useState(null);

  const handleLogout = () => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('token');
    navigate('/login');
  };

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <BsGraphUp size={20} />
    },
    {
      label: 'Despesas',
      icon: <GiPayMoney size={20} />,
      submenu: [
        {
          label: 'Minhas Despesas',
          path: '/expenses',
          icon: <BsListUl size={18} />
        },
        {
          label: 'Adicionar Despesa',
          path: '/add-expense',
          icon: <BsPlusCircle size={18} />
        },
        // {
        //   label: 'Editar Despesa Parcelas ou Recorrentes',
        //   path: '/edit-recurring-expenses',
        //   icon: <BsPencil size={18} />
        // }
      ]
    },
    {
      label: 'Receitas',
      icon: <GiReceiveMoney size={20} />,
      submenu: [
        {
          label: 'Minhas Receitas',
          path: '/income',
          icon: <BsCashCoin size={18} />
        },
        {
          label: 'Adicionar Receita',
          path: '/add-income',
          icon: <BsPlusCircle size={18} />
        },
        // {
        //   label: 'Editar Receitas Recorrentes',
        //   path: '/edit-recurring-incomes',
        //   icon: <BsPencil size={18} />
        // }
      ]
    },
    {
      label: 'Perfil',
      path: '/profile',
      icon: <BsPerson size={20} />
    }
  ];

  const handleMenuClick = (item) => {
    if (item.submenu) {
      setOpenMenu(openMenu === item.label ? null : item.label);
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className={`${styles.sidebar} ${className || ''}`}>
      <div className={styles.logo}>
        <img src={logo} alt="Logo do Planejador de Despesas das Galáxias" className={styles.logoImage} />        
      </div>

      <nav className={styles.menu}>
        {menuItems.map((item) => (
          <div key={item.label} className={styles.menuGroup}>
            <button
              className={`${styles.menuItem} ${
                (item.path && location.pathname === item.path) || 
                (item.submenu && item.submenu.some(sub => sub.path === location.pathname))
                  ? styles.active 
                  : ''
              }`}
              onClick={() => handleMenuClick(item)}
            >
              <span className={styles.icon}>{item.icon}</span>
              {item.label}
              {item.submenu && (
                <BsChevronDown
                  className={`${styles.arrow} ${openMenu === item.label ? styles.open : ''}`}
                  size={14}
                />
              )}
            </button>
            {item.submenu && openMenu === item.label && (
              <div className={styles.submenu}>
                {item.submenu.map((subItem) => (
                  <button
                    key={subItem.path}
                    className={`${styles.submenuItem} ${
                      location.pathname === subItem.path ? styles.active : ''
                    }`}
                    onClick={() => navigate(subItem.path)}
                  >
                    <span className={styles.icon}>{subItem.icon}</span>
                    {subItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Botão de logout para desktop */}
      <button 
        onClick={handleLogout} 
        className={`${styles.logoutButton} desktopLogoutButton`}
      >
        <BsDoorOpen size={20} />
        <span>Sair</span>
      </button>
    </div>
  );
};

export default Sidebar;