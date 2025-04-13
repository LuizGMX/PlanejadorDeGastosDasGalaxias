import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditIncomeForm from './EditIncomeForm';
import MobileEditIncome from './MobileEditIncome';

const EditIncomeWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [income, setIncome] = useState(null);
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

  // Buscar os dados da receita pelo ID
  useEffect(() => {
    const fetchIncome = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar dados da receita');
        }

        const data = await response.json();
        setIncome(data);
      } catch (err) {
        console.error('Erro ao buscar receita:', err);
        setError(err.message || 'Erro ao carregar dados da receita');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchIncome();
    }
  }, [id, navigate]);

  // Manipular a atualização da receita
  const handleSaveIncome = async (updatedIncome) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedIncome)
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar receita');
      }

      // Redirecionar para a lista de receitas
      navigate('/incomes');
    } catch (err) {
      console.error('Erro ao atualizar receita:', err);
      setError(err.message || 'Erro ao atualizar receita');
    }
  };

  // Manipular o cancelamento da edição
  const handleCancel = () => {
    navigate('/incomes');
  };

  if (loading) {
    return <div>Carregando dados da receita...</div>;
  }

  if (error) {
    return <div>Erro: {error}</div>;
  }

  if (!income) {
    return <div>Receita não encontrada</div>;
  }

  // Renderização condicional baseada no dispositivo
  return isMobile ? (
    <MobileEditIncome 
      income={income} 
      onSave={handleSaveIncome} 
      onCancel={handleCancel} 
    />
  ) : (
    <EditIncomeForm 
      income={income} 
      onSave={handleSaveIncome} 
      onCancel={handleCancel} 
    />
  );
};

export default EditIncomeWrapper; 