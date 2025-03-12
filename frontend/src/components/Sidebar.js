import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/sidebar.module.css';
import { BsGraphUp, BsListUl, BsPlusCircle, BsDoorOpen, BsCashCoin, BsCashStack, BsChevronDown } from 'react-icons/bs';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, setAuth } = useContext(AuthContext);
  const [openMenu, setOpenMenu] = useState(null);

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
      label: 'Despesas',
      icon: <BsListUl size={20} />,
      submenu: [
        {
          label: 'Lista de Despesas',
          path: '/expenses',
          icon: <BsListUl size={18} />
        },
        {
          label: 'Adicionar Despesa',
          path: '/add-expense',
          icon: <BsPlusCircle size={18} />
        }
      ]
    },
    {
      label: 'Receitas',
      icon: <BsCashCoin size={20} />,
      submenu: [
        {
          label: 'Lista de Receitas',
          path: '/income',
          icon: <BsCashCoin size={18} />
        },
        {
          label: 'Adicionar Receita',
          path: '/add-income',
          icon: <BsPlusCircle size={18} />
        }
      ]
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
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <h2>PGG</h2>
        <p>Planejador de Gastos das Galáxias</p>
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

      <button className={styles.logoutButton} onClick={handleLogout}>
        <span className={styles.icon}><BsDoorOpen size={20} /></span>
        Sair
      </button>
    </div>
  );
};

export default Sidebar; 