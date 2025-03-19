import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from '../styles/expenses.module.css';
import CurrencyInput from 'react-currency-input-field';

const EditIncomeForm = ({ income, onSave, onCancel }) => {
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: income.description,
    amount: income.amount,
    category_id: income.category_id,
    subcategory_id: income.subcategory_id,
    bank_id: income.bank_id,
    is_recurring: income.is_recurring,
    has_installments: income.has_installments,
    start_date: income.start_date || income.date,
    end_date: income.end_date,
    total_installments: income.total_installments,
    current_installment: income.current_installment
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/categories`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar categorias');
        }

        const data = await response.json();
        setCategories(data);
      } catch (err) {
        setError('Erro ao carregar categorias. Por favor, tente novamente.');
      }
    };

    fetchCategories();
  }, [auth.token]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bank`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar bancos');
        }

        const data = await response.json();
        setBanks(data);
      } catch (err) {
        setError('Erro ao carregar bancos. Por favor, tente novamente.');
      }
    };

    fetchBanks();
  }, [auth.token]);

  useEffect(() => {
    if (formData.category_id) {
      const fetchSubcategories = async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/categories/${formData.category_id}/subcategories`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          });

          if (!response.ok) {
            throw new Error('Falha ao carregar subcategorias');
          }

          const data = await response.json();
          setSubcategories(data);
        } catch (err) {
          setError('Erro ao carregar subcategorias. Por favor, tente novamente.');
        }
      };

      fetchSubcategories();
    } else {
      setSubcategories([]);
    }
  }, [formData.category_id, auth.token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Formata as datas corretamente
    const formattedData = {
      ...income,
      ...formData,
      amount: parseFloat(formData.amount),
      date: income.date
    };

    // Garante que as datas de recorrência sejam enviadas apenas se necessário
    if (!formData.is_recurring) {
      formattedData.start_date = null;
      formattedData.end_date = null;
    } else {
      // Garante que as datas sejam objetos Date válidos
      if (formData.start_date) {
        const startDate = new Date(formData.start_date);
        startDate.setHours(12, 0, 0, 0);
        formattedData.start_date = startDate.toISOString();
      }

      if (formData.end_date) {
        const endDate = new Date(formData.end_date);
        endDate.setHours(12, 0, 0, 0);
        formattedData.end_date = endDate.toISOString();
      }
    }

    console.log('Enviando dados:', formattedData);
    onSave(formattedData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Para campos de data, garante que o valor seja uma string ISO
    if (type === 'date' && value) {
      const date = new Date(value);
      date.setHours(12); // Meio-dia para evitar problemas de timezone
      console.log(`Convertendo data ${name}:`, {
        input: value,
        date: date,
        iso: date.toISOString()
      });
      setFormData(prev => ({
        ...prev,
        [name]: date.toISOString()
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Editar Receita</h2>
        {error && <p className={styles.error}>{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descrição"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Valor"
              step="0.01"
              required
            />
          </div>

          {formData.is_recurring && (
            <>
              <div className={styles.inputGroup}>
                <label>Data de Início da Recorrência</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date ? formData.start_date.split('T')[0] : ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Data de Fim da Recorrência</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date ? formData.end_date.split('T')[0] : ''}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecione uma categoria</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <select
              name="subcategory_id"
              value={formData.subcategory_id || ''}
              onChange={handleChange}
            >
              <option value="">Selecione uma subcategoria</option>
              {subcategories.map(subcategory => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.subcategory_name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <select
              name="bank_id"
              value={formData.bank_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um banco</option>
              {banks.map(bank => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.modalButtons}>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" className={styles.confirmButton}>
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditIncomeForm; 