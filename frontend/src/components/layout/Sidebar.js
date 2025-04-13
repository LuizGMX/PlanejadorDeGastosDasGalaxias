import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import styles from '../../styles/sidebar.module.css';
import { BsGraphUp, BsListUl, BsPlusCircle, BsDoorOpen, BsCashCoin, BsChevronDown, BsPerson, BsPencil, BsCreditCard, BsExclamationCircle } from 'react-icons/bs';
import logo from '../../assets/logo.svg';
import { GiPayMoney, GiReceiveMoney, } from "react-icons/gi";

const Sidebar = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, apiInterceptor, logout } = useContext(AuthContext);
  const [openMenu, setOpenMenu] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  useEffect(() => {
    // Verificar status da assinatura para destacar o menu quando necessário
    const checkSubscriptionStatus = async () => {
      if (!auth.token) return;
      
      try {
        const response = await apiInterceptor(
          `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/payments/status`,
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }
        );
        
        if (response.subscriptionExpired) {
          setSubscriptionStatus({ hasWarning: true });
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          // Mostrar aviso se faltar menos de 30 dias para expirar
          setSubscriptionStatus({ 
            hasWarning: data.hasSubscription && data.daysLeft <= 30,
            daysLeft: data.daysLeft 
          });
        }
      } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error);
      }
    };
    
    checkSubscriptionStatus();
  }, [auth.token, apiInterceptor]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Menu completo para usuários com assinatura válida
  const fullMenuItems = [
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
    },
    {
      label: 'Assinatura',
      path: '/payment',
      icon: subscriptionStatus?.hasWarning ? <BsExclamationCircle size={20} className={styles.warningIcon} /> : <BsCreditCard size={20} />,
      warning: subscriptionStatus?.hasWarning
    }
  ];
  
  // Menu restrito para usuários sem assinatura válida
  const restrictedMenuItems = [
    {
      label: 'Assinatura',
      path: '/payment',
      icon: <BsExclamationCircle size={20} className={styles.warningIcon} />,
      warning: true
    }
  ];
  
  // Seleciona quais itens mostrar com base no status da assinatura
  const menuItems = auth.subscriptionExpired ? restrictedMenuItems : fullMenuItems;

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

      {/* Botão de logout sempre visível */}
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