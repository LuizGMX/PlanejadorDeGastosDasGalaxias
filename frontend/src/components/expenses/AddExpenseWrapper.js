import React from 'react';
import { useMediaQuery } from 'react-responsive';
import MobileAddExpense from './MobileAddExpense';
import AddExpense from './AddExpense';
import { useLocation } from 'react-router-dom';

const AddExpenseWrapper = () => {
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const location = useLocation();
  
  // Verifica se está na rota de despesa parcelada
  const isInstallmentExpense = location.pathname === '/add-installment';
  
  return (
    <>
      {isMobile ? (
        <MobileAddExpense installment={isInstallmentExpense} />
      ) : (
        <AddExpense installment={isInstallmentExpense} />
      )}
    </>
  );
};

export default AddExpenseWrapper; 