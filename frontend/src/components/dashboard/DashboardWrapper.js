import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import MobileDashboard from './MobileDashboard';

const DashboardWrapper = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile ? <MobileDashboard /> : <Dashboard />;
};

export default DashboardWrapper; 