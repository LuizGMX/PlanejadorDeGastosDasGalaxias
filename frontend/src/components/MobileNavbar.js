import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import '../styles/navbar.mobile.css';
import { 
  BsHouseDoor, 
  BsArrowDownUp, 
  BsCreditCard, 
  BsPerson,
  BsChevronUp,
  BsListUl,
  BsPlusCircle,
  BsCashCoin
} from 'react-icons/bs';
import { GiPayMoney, GiReceiveMoney } from "react-icons/gi";

const MobileNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  
  // Se o usuário não estiver logado, não exibe a navbar
  if (!auth.token) return null;
  
  const isActive = (path) => location.pathname === path;
  
  const menuItems = [
    {
      label: 'Início',
      path: '/dashboard',
      icon: <BsHouseDoor className="mobileNavIcon" />
    },
    {
      label: 'Receitas',
      icon: <GiReceiveMoney className="mobileNavIcon" />,
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
        }
      ]
    },
    {
      label: 'Despesas',
      icon: <GiPayMoney className="mobileNavIcon" />,
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
        }
      ]
    },
    {
      label: 'Perfil',
      path: '/profile',
      icon: <BsPerson className="mobileNavIcon" />
    }
  ];

  const handleMenuClick = (item, index) => {
    if (item.submenu) {
      setOpenSubmenu(openSubmenu === index ? null : index);
    } else if (item.path) {
      navigate(item.path);
      setOpenSubmenu(null);
    }
  };
  
  const handleSubmenuClick = (path) => {
    navigate(path);
    setOpenSubmenu(null);
  };
  
  return (
    <nav className="mobileNavbar">
      <div className="mobileNavLinks">
        {menuItems.map((item, index) => (
          <div key={index} className="mobileNavItem">
            <div 
              className={`mobileNavLink ${
                (item.path && isActive(item.path)) || 
                (item.submenu && item.submenu.some(sub => isActive(sub.path)))
                  ? 'active' 
                  : ''
              }`}
              onClick={() => handleMenuClick(item, index)}
            >
              {item.icon}
              <span className="mobileNavText">{item.label}</span>
              {item.submenu && openSubmenu === index && (
                <BsChevronUp className="mobileSubmenuIndicator" />
              )}
            </div>
            
            {item.submenu && openSubmenu === index && (
              <div className="mobileSubmenu">
                {item.submenu.map((subItem, subIndex) => (
                  <div 
                    key={subIndex}
                    className={`mobileSubmenuItem ${isActive(subItem.path) ? 'active' : ''}`}
                    onClick={() => handleSubmenuClick(subItem.path)}
                  >
                    <span className="mobileSubmenuIcon">{subItem.icon}</span>
                    <span>{subItem.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavbar; 