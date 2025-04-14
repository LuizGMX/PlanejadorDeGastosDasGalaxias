import React from 'react';
import { useMediaQuery } from 'react-responsive';
import MobileAddExpense from './MobileAddExpense';
import AddExpense from './AddExpense';

const AddExpenseWrapper = () => {
  const isMobile = useMediaQuery({ maxWidth: 767 });
  
  return (
    <>
      {isMobile ? (
        <MobileAddExpense />
      ) : (
        <AddExpense />
      )}
    </>
  );
};

export default AddExpenseWrapper; 