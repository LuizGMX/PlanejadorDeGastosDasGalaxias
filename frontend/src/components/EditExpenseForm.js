import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from '../styles/expenses.module.css';
import CurrencyInput from 'react-currency-input-field';
import { BsCreditCard2Front } from 'react-icons/bs';
import { SiPix } from 'react-icons/si';

const EditExpenseForm = ({ expense, onUpdate, onCancel }) => {
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: expense.description,
    amount: expense.amount,
    date: expense.expense_date.split('T')[0],
    category_id: expense.category_id,
    subcategory_id: expense.subcategory_id,
    payment_method: expense.payment_method,
    bank_id: expense.bank_id,
    update_future: false,
    is_recurring: expense.is_recurring
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/categories`, {
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
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/subcategories/${formData.category_id}`, {
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          ...formData,
          expense_date: formData.date,
          is_recurring: formData.is_recurring
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar despesa');
      }

      const data = await response.json();
      onUpdate(data.expense);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2>Editar Despesa</h2>
        {error && <p className={styles.error}>{error}</p>}
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
            <CurrencyInput
              name="amount"
              placeholder="R$ 0,00"
              decimalsLimit={2}
              prefix="R$ "
              decimalSeparator=","
              groupSeparator="."
              value={formData.amount}
              onValueChange={(value) => {
                const numericValue = value ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : '';
                setFormData(prev => ({ ...prev, amount: numericValue }));
              }}
              className={styles.input}
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

          {expense.is_recurring && (
            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="update_future"
                name="update_future"
                checked={formData.update_future}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <label htmlFor="update_future" className={styles.checkboxLabel}>
                Atualizar despesas futuras
              </label>
              <small className={styles.helperText}>
                Marque esta opção para atualizar todas as ocorrências futuras desta despesa recorrente
              </small>
            </div>
          )}

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

          <div className={styles.paymentMethodGroup}>
            <label className={styles.label}>Forma de Pagamento</label>
            <div className={styles.paymentButtons}>
              <button
                type="button"
                className={`${styles.paymentButton} ${formData.payment_method === 'card' ? styles.active : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, payment_method: 'card' }))}
              >
                <BsCreditCard2Front size={24} className={styles.cardIcon} />
                <span>Cartão</span>
              </button>
              <button
                type="button"
                className={`${styles.paymentButton} ${formData.payment_method === 'pix' ? styles.active : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, payment_method: 'pix' }))}
              >
                <SiPix size={24} className={styles.pixIcon} />
                <span>Pix</span>
              </button>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.submitButton}>
              Salvar Alterações
            </button>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseForm; 