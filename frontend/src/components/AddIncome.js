import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/addIncome.module.css';
import sharedStyles from '../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';
import { BsPlusCircle } from 'react-icons/bs';

const AddIncome = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: '',
    start_date: '',
    end_date: '',
    is_recurring: false,
    category_id: '',
    subcategory_id: '',
    bank_id: ''
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      if (formData.is_recurring) {
        if (!formData.start_date || !formData.end_date) {
          throw new Error('Data inicial e final são obrigatórias para receitas recorrentes');
        }
        formData.date = formData.start_date;
      } else if (!formData.date) {
        throw new Error('Data é obrigatória para receitas não recorrentes');
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao adicionar receita');
      }

      setSuccess('Receita adicionada com sucesso!');
      setTimeout(() => {
        navigate('/income');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erro ao adicionar receita. Por favor, tente novamente.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <h1 className={styles.title}><BsPlusCircle size={24} className={styles.icon} /> Adicionar Receita</h1>

        {error && <p className={styles.error}>{error}</p>}
        {success && (
          <div className={sharedStyles.successMessage}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className="material-icons">description</span>
              Descrição
            </label>
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
            <label className={styles.label}>
              <span className="material-icons">attach_money</span>
              Valor
            </label>
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

          <div className={styles.paymentOptions}>
            <div className={`${styles.paymentOption} ${formData.is_recurring ? styles.active : ''}`}>
              <div className={styles.optionHeader} onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  is_recurring: !prev.is_recurring,
                  date: !prev.is_recurring ? prev.start_date : '',
                  start_date: !prev.is_recurring ? new Date().toISOString().split('T')[0] : '',
                  end_date: !prev.is_recurring ? '' : prev.end_date
                }));
              }}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    id="is_recurring"
                    name="is_recurring"
                    checked={formData.is_recurring}
                    onChange={() => {}}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkmark}></span>
                </div>
                <label htmlFor="is_recurring" className={styles.optionLabel}>
                  <span className="material-icons">sync</span>
                  Recorrente
                </label>
              </div>

              {formData.is_recurring && (
                <div className={styles.optionContent}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="start_date" className={styles.label}>
                      Data de Início
                    </label>
                    <input
                      type="date"
                      id="start_date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      className={styles.input}
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="end_date" className={styles.label}>
                      Data de Término
                    </label>
                    <input
                      type="date"
                      id="end_date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                      className={styles.input}
                      min={formData.start_date}
                      max={(() => {
                        if (!formData.start_date) return '';
                        const startDate = new Date(formData.start_date);
                        const maxDate = new Date(startDate);
                        maxDate.setFullYear(maxDate.getFullYear() + 10);
                        return maxDate.toISOString().split('T')[0];
                      })()}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {!formData.is_recurring && (
            <div className={styles.inputGroup}>
              <label htmlFor="date" className={styles.label}>
                Data
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className="material-icons">category</span>
              Categoria
            </label>
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
              <label className={styles.label}>
                <span className="material-icons">sell</span>
                Subcategoria
              </label>
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
              <label className={styles.label}>
                <span className="material-icons">account_balance</span>
                Banco
              </label>
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

          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.submitButton}
            >
              Adicionar Receita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIncome;
