import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import { FaCreditCard, FaQrcode } from 'react-icons/fa';

const AddExpense = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    subcategory_id: '',
    payment_method: 'card',
    bank_id: '' // Adicionando o campo para o banco
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]); // Novo estado para os bancos
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

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('/api/bank', {
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
          const response = await fetch(`/api/categories/${formData.category_id}/subcategories`, {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentMethod = (method) => {
    setFormData(prev => ({
      ...prev,
      payment_method: method
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

          {subcategories.length > 0 && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Subcategoria</label>
              <select
                name="subcategory_id"
                value={formData.subcategory_id}
                onChange={handleChange}
                className={styles.input}
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

          {banks.length > 0 && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Banco</label>
              <select
                name="bank_id"
                value={formData.bank_id}
                onChange={handleChange}
                className={styles.input}
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
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Forma de Pagamento</label>
            <div className={styles.buttonGroup}>
              <button type="button" className={`${styles.button} ${formData.payment_method === 'card' ? styles.active : ''}`} onClick={() => handlePaymentMethod('card')}>
                <FaCreditCard /> Cartão
              </button>
              <button type="button" className={`${styles.button} ${formData.payment_method === 'pix' ? styles.active : ''}`} onClick={() => handlePaymentMethod('pix')}>
                <FaQrcode /> PIX
              </button>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.button}>
              Adicionar Despesa
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} className={`${styles.button} ${styles.secondary}`}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
