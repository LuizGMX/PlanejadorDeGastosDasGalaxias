import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';

const AddExpense = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    payment_method: 'card'
  });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories', {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Falha ao adicionar despesa');
      }

      setSuccess('Despesa adicionada com sucesso!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Erro ao adicionar despesa. Por favor, tente novamente.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <h1 className={styles.title}>Adicionar Despesa</h1>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Descrição</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Valor</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className={styles.input}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Data</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Categoria</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className={styles.input}
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
            <label className={styles.label}>Método de Pagamento</label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className={styles.input}
              required
            >
              <option value="card">Cartão</option>
              <option value="pix">PIX</option>
              <option value="money">Dinheiro</option>
            </select>
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.button}>
              Adicionar Despesa
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={`${styles.button} ${styles.secondary}`}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;