import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import dataTableStyles from '../../styles/dataTable.module.css';
import EditIncomeForm from './EditIncomeForm';
import { toast } from 'react-hot-toast';
import { BsArrowLeft } from 'react-icons/bs';

const EditIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { auth } = useContext(AuthContext);
  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchIncome = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${id}`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar receita');
        }

        const data = await response.json();
        setIncome(data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar receita:', error);
        setError('Erro ao carregar receita. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    if (id) {
      fetchIncome();
    } else {
      navigate('/income');
    }
  }, [id, auth.token, navigate]);

  const handleSave = async (incomeData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(incomeData)
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar receita');
      }

      toast.success('Receita atualizada com sucesso!');
      navigate('/income');
    } catch (error) {
      console.error('Erro ao atualizar receita:', error);
      toast.error('Erro ao atualizar receita');
    }
  };

  const handleCancel = () => {
    navigate('/income');
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
            onClick={() => navigate('/income')}
            className={dataTableStyles.backButton}
          >
            <BsArrowLeft /> Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!income) {
    return (
      <div className={dataTableStyles.container}>
        <div className={dataTableStyles.card}>
          <p className={dataTableStyles.error}>Receita não encontrada</p>
          <button 
            onClick={() => navigate('/income')}
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
      <EditIncomeForm
        income={income}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default EditIncome; 