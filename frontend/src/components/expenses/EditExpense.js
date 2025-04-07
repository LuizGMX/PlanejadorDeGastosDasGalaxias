import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';
import dataTableStyles from '../../styles/dataTable.module.css';
import EditExpenseForm from './EditExpenseForm';
import { toast } from 'react-hot-toast';
import { BsArrowLeft } from 'react-icons/bs';

const EditExpense = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { auth } = useContext(AuthContext);
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${id}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar despesa');
        }

        const data = await response.json();
        setExpense(data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar despesa:', error);
        setError('Erro ao carregar despesa. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    if (id) {
      fetchExpense();
    } else {
      navigate('/expenses');
    }
  }, [id, auth.token, navigate]);

  const handleSave = async (expenseData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(expenseData)
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar despesa');
      }

      toast.success('Despesa atualizada com sucesso!');
      navigate('/expenses');
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      toast.error('Erro ao atualizar despesa');
    }
  };

  const handleCancel = () => {
    navigate('/expenses');
  };

  if (loading) {
    return (
      <div className={dataTableStyles.container}>
        <div className={dataTableStyles.card}>
          <p className={dataTableStyles.loading}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={dataTableStyles.container}>
        <div className={dataTableStyles.card}>
          <p className={dataTableStyles.error}>{error}</p>
          <button 
            onClick={() => navigate('/expenses')}
            className={dataTableStyles.backButton}
          >
            <BsArrowLeft /> Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className={dataTableStyles.container}>
        <div className={dataTableStyles.card}>
          <p className={dataTableStyles.error}>Despesa não encontrada</p>
          <button 
            onClick={() => navigate('/expenses')}
            className={dataTableStyles.backButton}
          >
            <BsArrowLeft /> Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={dataTableStyles.container}>
      <EditExpenseForm
        expense={expense}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default EditExpense; 