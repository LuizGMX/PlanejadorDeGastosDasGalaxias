import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/expenseForm.module.css';
import LogoutButton from './LogoutButton';
import CurrencyInput from 'react-currency-input-field';

const ExpenseForm = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category_id: '',
    subcategory_id: '',
    bank_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'card',
    has_installments: false,
    current_installment: '',
    total_installments: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Iniciando busca de dados...');
        const categoriesResponse = await fetch('/api/categories', {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!categoriesResponse.ok) {
          const errorData = await categoriesResponse.json();
          throw new Error(errorData.message || 'Erro ao carregar categorias');
        }
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.description || !formData.amount || !formData.category_id ||
        !formData.subcategory_id || !formData.bank_id) {
        throw new Error('Por favor, preencha todos os campos obrigatórios');
      }

      if (formData.has_installments &&
        (!formData.current_installment || !formData.total_installments)) {
        throw new Error('Por favor, preencha os campos de parcelas');
      }

      const dataToSend = {
        ...formData,
        amount: parseFloat(formData.amount.replace('R$', '').replace(',', '.').trim())
      };

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar despesa');
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className={styles.pageContainer}>
      <LogoutButton />
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="description">Descrição</label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="amount">Valor</label>
          {/* <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
          /> */}
          <CurrencyInput
            name="amount"
            id="amount"
            placeholder="R$ 0,00"
            decimalsLimit={2}
            prefix="R$ "
            decimalSeparator=","
            groupSeparator="."
            value={formData.amount}
            onValueChange={(value) => {
              // Converte o valor para número antes de salvar
              const numericValue = value ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : '';
              setFormData(prev => ({ ...prev, amount: numericValue }));
            }}
            className={styles.input}
            required
          />
        </div>

        <button type="submit" className={styles.button}>Salvar Despesa</button>
      </form>
    </div>
  );
};

export default ExpenseForm;