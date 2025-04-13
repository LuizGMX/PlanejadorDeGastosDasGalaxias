import React from 'react';
import styles from '../../styles/layout.module.css';

const Layout = ({ children }) => {
  return (
    <div className={styles.layout}>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
};

export default Layout; 