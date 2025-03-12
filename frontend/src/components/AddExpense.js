import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import { BsCreditCard2Front } from 'react-icons/bs';
import { SiPix } from 'react-icons/si';
import CurrencyInput from 'react-currency-input-field';

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
    bank_id: '',
    has_installments: false,
    total_installments: 1,
    current_installment: 1,
    is_recurring: false,
    end_date: ''
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);
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
    
    if (name === 'total_installments') {
      const totalParcelas = parseInt(value) || 1;
      setFormData(prev => ({
        ...prev,
        [name]: totalParcelas,
        current_installment: Math.min(prev.current_installment, totalParcelas)
      }));
    } else if (name === 'current_installment') {
      const parcelaAtual = parseInt(value) || 1;
      setFormData(prev => ({
        ...prev,
        [name]: Math.min(parcelaAtual, prev.total_installments)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePaymentMethod = (method) => {
    setFormData(prev => ({
      ...prev,
      payment_method: method
    }));
  };

  const formatCurrency = (value) => {
    if (!value) return '';
    
    // Converte para número se for string
    const numericValue = typeof value === 'string' 
      ? parseFloat(value.replace(/\D/g, '')) / 100
      : value;
    
    // Se não for um número válido, retorna vazio
    if (isNaN(numericValue)) return '';
    
    // Formata o número para moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numericValue);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({
      ...prev,
      amount: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (formData.has_installments) {
        if (formData.current_installment > formData.total_installments) {
          throw new Error('A parcela atual não pode ser maior que o total de parcelas');
        }
        if (formData.current_installment < 1) {
          throw new Error('A parcela atual não pode ser menor que 1');
        }
        if (formData.total_installments < 2) {
          throw new Error('O número total de parcelas deve ser pelo menos 2');
        }
      }

      if (formData.is_recurring && formData.end_date) {
        const startDate = new Date(formData.date);
        const endDate = new Date(formData.end_date);
        const maxDate = new Date(startDate);
        maxDate.setFullYear(maxDate.getFullYear() + 10);

        if (endDate > maxDate) {
          throw new Error('O período de recorrência não pode ser maior que 10 anos');
        }
      }

      // Prepara os dados para envio
      const baseDate = new Date(formData.date);
      
      // Garante que o valor total seja preservado
      const totalAmount = formData.amount;
      const installmentAmount = formData.has_installments 
        ? totalAmount 
        : formData.amount;

      const dataToSend = {
        ...formData,
        amount: installmentAmount,
        // Calcula a data da primeira parcela subtraindo os meses necessários
        first_installment_date: formData.has_installments 
          ? new Date(baseDate.setMonth(baseDate.getMonth() - (formData.current_installment - 1))).toISOString().split('T')[0]
          : formData.date
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
        throw new Error(errorData.message || 'Falha ao adicionar despesa');
      }

      setSuccess('Despesa adicionada com sucesso!');
      setTimeout(() => {
        navigate('/expenses');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erro ao adicionar despesa. Por favor, tente novamente.');
    }
  };

  const formatPluralText = (number, singular, plural) => {
    return `${number} ${number === 1 ? singular : plural}`;
  };

  const getInstallmentMessage = (total, current) => {
    if (current === 1) {
      return `Serão criadas as próximas ${formatPluralText(total - 1, 'parcela', 'parcelas')} a partir desta data`;
    } else if (current === total) {
      return `${total - 1 === 1 ? 'Será criada' : 'Serão criadas'} ${formatPluralText(total - 1, 'parcela anterior', 'parcelas anteriores')} a esta data`;
    } else {
      const anteriores = current - 1;
      const posteriores = total - current;
      return `Além da parcela atual, ${anteriores + posteriores === 1 ? 'será criada' : 'serão criadas'} ${formatPluralText(anteriores, 'parcela anterior', 'parcelas anteriores')} e ${formatPluralText(posteriores, 'parcela posterior', 'parcelas posteriores')} a esta data`;
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
            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="has_installments"
                name="has_installments"
                checked={formData.has_installments}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    has_installments: e.target.checked,
                    total_installments: e.target.checked ? prev.total_installments : 1
                  }));
                }}
                className={styles.checkbox}
              />
              <label htmlFor="has_installments" className={styles.checkboxLabel}>
                Parcelado
              </label>
            </div>
          </div>

          {formData.has_installments && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Número de Parcelas</label>
                <input
                  type="number"
                  name="total_installments"
                  value={formData.total_installments}
                  onChange={handleChange}
                  min="2"
                  max="24"
                  className={styles.input}
                  required={formData.has_installments}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Qual parcela você está pagando?</label>
                <input
                  type="number"
                  name="current_installment"
                  value={formData.current_installment}
                  onChange={handleChange}
                  min="1"
                  max={formData.total_installments}
                  className={styles.input}
                  required={formData.has_installments}
                />
                {formData.amount && formData.total_installments > 1 && (
                  <small className={styles.installmentInfo}>
                    {formData.total_installments}x de {formatCurrency(formData.amount / formData.total_installments)}
                    <br />
                    {getInstallmentMessage(formData.total_installments, formData.current_installment)}
                  </small>
                )}
              </div>
            </>
          )}

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

          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="is_recurring"
              name="is_recurring"
              checked={formData.is_recurring}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  is_recurring: e.target.checked,
                  end_date: e.target.checked ? prev.end_date : ''
                }));
              }}
              className={styles.checkbox}
            />
            <label htmlFor="is_recurring" className={styles.checkboxLabel}>
              Gasto Recorrente
            </label>
          </div>

          {formData.is_recurring && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Data Final da Recorrência</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={styles.input}
                required
                min={formData.date}
                max={(() => {
                  const maxDate = new Date(formData.date);
                  maxDate.setFullYear(maxDate.getFullYear() + 10);
                  return maxDate.toISOString().split('T')[0];
                })()}
              />
              <small className={styles.helperText}>
                O período de recorrência não pode ser maior que 10 anos
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
                onClick={() => handlePaymentMethod('card')}
              >
                <BsCreditCard2Front size={24} className={styles.cardIcon} />
                <span>Cartão</span>
              </button>
              <button
                type="button"
                className={`${styles.paymentButton} ${formData.payment_method === 'pix' ? styles.active : ''}`}
                onClick={() => handlePaymentMethod('pix')}
              >
                <SiPix size={24} className={styles.pixIcon} />
                <span>Pix</span>
              </button>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.submitButton}
            >
              Adicionar Despesa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
