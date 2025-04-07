import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import dataTableStyles from '../../styles/dataTable.module.css';
import sharedStyles from '../../styles/shared.module.css';
import MobileAddIncome from './MobileAddIncome';
import AddIncome from './AddIncome';

const AddIncomeWrapper = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile ? <MobileAddIncome /> : <AddIncome />;
};

export default AddIncomeWrapper; 