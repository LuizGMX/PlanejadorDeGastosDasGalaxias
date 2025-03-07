import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import styles from './Layout.module.css';

function Layout({ children }) {
  const { setAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuth({ token: null, user: null });
    navigate('/');
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.navigation}>
          <Link to="/dashboard" className={styles.navButton}>
            <DashboardIcon />
            <span>Dashboard</span>
          </Link>
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <LogoutIcon />
          <span>Sair</span>
        </button>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

export default Layout; 