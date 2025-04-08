import React, { useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import '../../styles/mobile/navbar.mobile.css';
import { 
  BsHouseDoor, 
  BsPerson,
  BsChevronUp,
  BsListUl,
  BsPlusCircle,
  BsCashCoin
} from 'react-icons/bs';
import { GiPayMoney, GiReceiveMoney } from "react-icons/gi";
import { isIOS } from '../../utils/iosSupport';

const MobileNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  
  useEffect(() => {
    // Verificar se é um dispositivo iOS
    const isIOSDevice = isIOS();
    setIsIOSDevice(isIOSDevice);
    
    // Forçar exibição da navbar em dispositivos iOS
    if (isIOSDevice) {
      const navbarElement = document.querySelector('.mobileNavbar');
      if (navbarElement) {
        navbarElement.style.display = 'block';
        navbarElement.classList.add('ios-navbar');
        console.log('MobileNavbar: Forcing display for iOS device');
      }
      
      // Adicionar event listeners para garantir que a navbar seja exibida corretamente
      const handleResize = () => {
        const navbarElement = document.querySelector('.mobileNavbar');
        if (navbarElement) {
          navbarElement.style.display = 'block';
        }
      };
      
      const handleOrientationChange = () => {
        setTimeout(() => {
          const navbarElement = document.querySelector('.mobileNavbar');
          if (navbarElement) {
            navbarElement.style.display = 'block';
          }
        }, 100);
      };
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleOrientationChange);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
      };
    }
  }, []);
  
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
  
  const navbarClassName = `mobileNavbar ${isIOSDevice ? 'ios-navbar' : ''}`;
  
  return (
    <nav className={navbarClassName}>
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