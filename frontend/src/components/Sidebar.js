import React, { useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/sidebar.module.css';
import { BsGraphUp, BsListUl, BsPlusCircle, BsDoorOpen, BsCashCoin, BsCashStack, BsChevronDown, BsUpload } from 'react-icons/bs';
import logo from '../assets/logo.svg';
import { GiPayMoney } from "react-icons/gi";
import { GiReceiveMoney } from "react-icons/gi";


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
      icon: <GiPayMoney size={20} />,
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
      icon: <GiReceiveMoney  size={20} />,
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
    },
    // {
    //   label: 'Importar Planilha',
    //   path: '/upload-spreadsheet',
    //   icon: <BsUpload size={20} />
    // }
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
        <img src={logo} alt="Logo do Planejador de Gastos das Galáxias" className={styles.logoImage} />        
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