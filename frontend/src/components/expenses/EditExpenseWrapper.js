import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditExpenseForm from './EditExpenseForm';
import MobileEditExpense from './MobileEditExpense';

const EditExpenseWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Função para verificar se é mobile
  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  // Monitorar mudanças no tamanho da tela
  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Buscar os dados da despesa pelo ID
  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar dados da despesa');
        }

        const data = await response.json();
        setExpense(data);
      } catch (err) {
        console.error('Erro ao buscar despesa:', err);
        setError(err.message || 'Erro ao carregar dados da despesa');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchExpense();
    }
  }, [id, navigate]);

  // Manipular a atualização da despesa
  const handleSaveExpense = async (updatedExpense) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedExpense)
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar despesa');
      }

      // Redirecionar para a lista de despesas
      navigate('/expenses');
    } catch (err) {
      console.error('Erro ao atualizar despesa:', err);
      setError(err.message || 'Erro ao atualizar despesa');
    }
  };

  // Manipular o cancelamento da edição
  const handleCancel = () => {
    navigate('/expenses');
  };

  if (loading) {
    return <div>Carregando dados da despesa...</div>;
  }

  if (error) {
    return <div>Erro: {error}</div>;
  }

  if (!expense) {
    return <div>Despesa não encontrada</div>;
  }

  // Renderização condicional baseada no dispositivo
  return isMobile ? (
    <MobileEditExpense 
      expense={expense} 
      onSave={handleSaveExpense} 
      onCancel={handleCancel} 
    />
  ) : (
    <EditExpenseForm 
      expense={expense} 
      onSave={handleSaveExpense} 
      onCancel={handleCancel} 
    />
  );
};

export default EditExpenseWrapper; 