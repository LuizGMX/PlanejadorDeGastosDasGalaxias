import React from 'react';
import Sidebar from './Sidebar';
import MobileNavbar from './MobileNavbar';
import styles from '../styles/layout.module.css';

const Layout = ({ children }) => {
  return (
    <div className={styles.layout}>
      <Sidebar className="desktopNavbar" />
      <main className={styles.mainContent}>
        {children}
      </main>
      <MobileNavbar />
    </div>
  );
};

export default Layout; 