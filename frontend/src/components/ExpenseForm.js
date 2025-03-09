import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import CurrencyInput from 'react-currency-input-field';
import styles from '../styles/expenseForm.module.css';
import LogoutButton from './LogoutButton';

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
        // Busca categorias
        const categoriesResponse = await fetch('/api/categories', {
          headers: { 
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Resposta da busca de categorias:', categoriesResponse);
        if (!categoriesResponse.ok) {
          const errorData = await categoriesResponse.json();
          throw new Error(errorData.message || 'Erro ao carregar categorias');
        }
        const categoriesData = await categoriesResponse.json();
        console.log('Dados das categorias:', categoriesData);
        setCategories(categoriesData);

        // // Busca bancos do usuário
        // const banksResponse = await fetch('/api/user/banks', {
        //   headers: { 
        //     'Authorization': `Bearer ${auth.token}`,
        //     'Content-Type': 'application/json'
        //   }
        // });
        // console.log('Resposta da busca de bancos:', banksResponse);
        // if (!banksResponse.ok) {
        //   const errorData = await banksResponse.json();
        //   throw new Error(errorData.message || 'Erro ao carregar bancos');
        // }
        // const banksData = await banksResponse.json();
        // console.log('Dados dos bancos:', banksData);
        // setBanks(banksData);

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.token]);

  useEffect(() => {
    if (formData.category_id) {
      const fetchSubcategories = async () => {
        try {
          console.log('Buscando subcategorias para categoria:', formData.category_id);
          const response = await fetch(`/api/categories/${formData.category_id}/subcategories`, {
            headers: { 
              'Authorization': `Bearer ${auth.token}`,
              'Content-Type': 'application/json'
            }
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao carregar subcategorias');
          }
          const data = await response.json();
          console.log('Subcategorias carregadas:', data);
          setSubcategories(data);
        } catch (err) {
          console.error('Erro ao carregar subcategorias:', err);
          setError(err.message);
        }
      };

      fetchSubcategories();
      // Limpa a subcategoria selecionada quando muda a categoria
      setFormData(prev => ({ ...prev, subcategory_id: '' }));
    } else {
      setSubcategories([]);
      setFormData(prev => ({ ...prev, subcategory_id: '' }));
    }
  }, [formData.category_id, auth.token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validações
      if (!formData.description || !formData.amount || !formData.category_id || 
          !formData.subcategory_id || !formData.bank_id) {
        throw new Error('Por favor, preencha todos os campos obrigatórios');
      }

      if (formData.has_installments && 
          (!formData.current_installment || !formData.total_installments)) {
        throw new Error('Por favor, preencha os campos de parcelas');
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar despesa');
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

    // Log para debug
    if (name === 'category_id') {
      console.log('Categoria selecionada:', value);
    } else if (name === 'subcategory_id') {
      console.log('Subcategoria selecionada:', value);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

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
          <CurrencyInput
            id="amount"
            name="amount"
            placeholder="R$ 0,00"
            decimalsLimit={2}
            prefix="R$ "
            decimalSeparator=","
            groupSeparator="."
            value={formData.amount}
            onValueChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="category_id">Categoria</label>
          <select
            id="category_id"
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

        {formData.category_id && (
          <div className={styles.formGroup}>
            <label htmlFor="subcategory_id">Subcategoria</label>
            <select
              id="subcategory_id"
              name="subcategory_id"
              value={formData.subcategory_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecione uma subcategoria</option>
              {subcategories.map(subcategory => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.subcategory_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="bank_id">Banco</label>
          <select
            id="bank_id"
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

        <div className={styles.formGroup}>
          <label htmlFor="expense_date">Data</label>
          <input
            type="date"
            id="expense_date"
            name="expense_date"
            value={formData.expense_date}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.paymentMethodGroup}>
          <label>Método de Pagamento</label>
          <div className={styles.paymentButtons}>
            <button
              type="button"
              className={`${styles.paymentButton} ${formData.payment_method === 'card' ? styles.active : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, payment_method: 'card' }))}
            >
              <span className={styles.icon}>💳</span>
              Cartão
            </button>
            <button
              type="button"
              className={`${styles.paymentButton} ${formData.payment_method === 'pix' ? styles.active : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, payment_method: 'pix' }))}
            >
              <span className={styles.icon}>📱</span>
              Pix
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="has_installments"
              checked={formData.has_installments}
              onChange={handleChange}
            />
            Possui parcelas
          </label>
        </div>

        {formData.has_installments && (
          <div className={styles.installmentsGroup}>
            <div className={styles.formGroup}>
              <label htmlFor="current_installment">Parcela Atual</label>
              <input
                type="number"
                id="current_installment"
                name="current_installment"
                value={formData.current_installment}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="total_installments">Total de Parcelas</label>
              <input
                type="number"
                id="total_installments"
                name="total_installments"
                value={formData.total_installments}
                onChange={handleChange}
                min="1"
                required
              />
            </div>
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.button}>
            Salvar Despesa
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            onClick={() => navigate('/dashboard')}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm; 