import React, { useState, useEffect } from 'react';
import MobileAddExpense from './MobileAddExpense';
import AddExpense from './AddExpense';

const AddExpenseWrapper = () => {
  // Função para verificar se a tela é mobile
  const isMobileView = () => {
    return window.innerWidth <= 768;
  };

  // Estado para controlar se é mobile
  const [isMobile, setIsMobile] = useState(isMobileView());
  
  // Efeito para monitorar mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileView());
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Renderização condicional baseada no dispositivo
  return isMobile ? <MobileAddExpense /> : <AddExpense />;
};

export default AddExpenseWrapper; 