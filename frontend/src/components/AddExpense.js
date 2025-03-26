import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import { BsCreditCard2Front, BsPlusCircle } from 'react-icons/bs';
import { SiPix } from 'react-icons/si';
import CurrencyInput from 'react-currency-input-field';
import addExpenseStyles from '../styles/addExpense.module.css';

const AddExpense = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: '',
    category_id: '',
    subcategory_id: '',
    bank_id: '',
    is_recurring: false,
    has_installments: false,
    is_in_cash: false,
    total_installments: '',
    current_installment: '',
    end_date: '',
    payment_method: 'credit_card',
    card_type: 'credit_card',
    recurrence_type: null
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/banks/favorites`, {
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
    const { name, value } = e.target;

    if (name === 'total_installments' || name === 'current_installment') {
      // Remove qualquer caractere que não seja número
      const numericValue = value.replace(/\D/g, '');
      
      // Atualiza o estado com o valor digitado (mesmo que vazio)
      setFormData(prev => ({
        ...prev,
        [name]: numericValue ? parseInt(numericValue) : ''
      }));
    } else if (name === 'date' || name === 'end_date') {
      // Formata a data para o formato correto
      const formattedDate = value ? value.split('T')[0] : '';
      setFormData(prev => ({
        ...prev,
        [name]: formattedDate
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


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validação do tipo de pagamento
      if (!formData.is_recurring && !formData.has_installments && !formData.is_in_cash) {
        throw new Error('Selecione uma forma de pagamento: Recorrente, Parcelado ou À Vista');
      }

      // Validação da data para pagamento à vista
      if (formData.is_in_cash) {
        const expenseDate = new Date(formData.date);
        if (isNaN(expenseDate.getTime())) {
          throw new Error('A data da despesa é obrigatória para pagamento à vista');
        }
      }

      // Validações específicas para pagamento parcelado
      if (formData.has_installments) {
        // Validação do número de parcelas
        if (formData.total_installments === '') {
          throw new Error('O número de parcelas é obrigatório');
        }
        if (formData.total_installments < 2) {
          throw new Error('O número de parcelas deve ser no mínimo 2');
        }
        if (formData.total_installments > 100) {
          throw new Error('O número de parcelas não pode ser maior que 100');
        }

        // Validação da parcela atual
        if (formData.current_installment === '') {
          throw new Error('O número da parcela atual é obrigatório');
        }
        if (formData.current_installment < 1) {
          throw new Error('O número da parcela atual deve ser no mínimo 1');
        }
        if (formData.current_installment > formData.total_installments) {
          throw new Error('O número da parcela atual não pode ser maior que o total de parcelas');
        }

        // Validação da data para pagamento parcelado
        const expenseDate = new Date(formData.date);
        if (isNaN(expenseDate.getTime())) {
          throw new Error('A data da despesa é obrigatória para pagamento parcelado');
        }
      }

      if (formData.is_recurring && formData.end_date) {
        const endDate = new Date(formData.end_date);
        if (isNaN(endDate.getTime())) {
          throw new Error('A data final da recorrência é inválida');
        }

        const maxDate = new Date(formData.date);
        maxDate.setFullYear(maxDate.getFullYear() + 10);

        if (endDate > maxDate) {
          throw new Error('O período de recorrência não pode ser maior que 10 anos');
        }

        // Inclui a data inicial na criação da despesa recorrente
        formData.start_date = formData.date;
      }

      // Prepara os dados para envio
      const baseDate = new Date(formData.date);

      // Calcula o valor da parcela se for pagamento parcelado
      const totalAmount = parseFloat(formData.amount);
      const installmentAmount = formData.has_installments
        ? (totalAmount / formData.total_installments).toFixed(2)
        : totalAmount;

      // Calcula a data da primeira parcela
      let first_installment_date = formData.date;
      if (formData.has_installments && formData.current_installment > 1) {
        const firstDate = new Date(baseDate);
        firstDate.setMonth(firstDate.getMonth() - (formData.current_installment - 1));
        first_installment_date = firstDate.toISOString().split('T')[0];
      }

      // Define as datas para despesas fixas
      let start_date = null;
      let end_date = null;
      if (formData.is_recurring) {        
        start_date = formData.date;
        const endDateObj = new Date(formData.date);        
        endDateObj.setMonth(11); // Define o mês como dezembro
        endDateObj.setDate(31); // Define o dia como 31
        endDateObj.setYear(2099);
        end_date = endDateObj.toISOString().split('T')[0];
      }

      const dataToSend = {
        ...formData,
        amount: installmentAmount,
        first_installment_date,
        expense_date: formData.date,
        start_date,
        end_date
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses`, {
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
      if (total - 1 === 1) {
        return `Será criada uma outra parcela (a última), além da parcela atual`;
      }
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
        <h1 className={styles.title}><BsPlusCircle size={24} className={styles.icon} /> Adicionar Despesa</h1>

        {error && <p className={styles.error}>{error}</p>}
        {success && (
          <div className={addExpenseStyles.successMessage}>
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
              value={formData.amount}
              onValueChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  amount: value || ''
                }));
              }}
              intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
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
                  has_installments: false,
                  is_in_cash: false,
                  date: !prev.is_recurring ? '' : new Date().toLocaleDateString('pt-BR'),
                  recurrence_type: !prev.is_recurring ? 'monthly' : null
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
                <label htmlFor="is_recurring" className={styles.optionLabel} style={{fontSize: '15px'}}>
                  <span className="material-icons">sync</span>
                  Fixo
                </label>
              </div>

              {formData.is_recurring && (
                <div className={styles.optionContent}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>
                      <span className="material-icons">calendar_today</span>
                      Data da Primeira Cobrança
                    </label>
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
                    <label className={styles.label}>
                      <span className="material-icons">update</span>
                      Periodicidade
                    </label>
                    <select
                      name="recurrence_type"
                      value={formData.recurrence_type || 'monthly'}
                      onChange={handleChange}
                      className={styles.input}
                      required
                    >
                      <option value="daily">Diária</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="semiannual">Semestral</option>
                      <option value="annual">Anual</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className={`${styles.paymentOption} ${formData.has_installments ? styles.active : ''}`}>
              <div className={styles.optionHeader} onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setFormData(prev => ({
                  ...prev,
                  has_installments: !prev.has_installments,
                  is_recurring: false,
                  is_in_cash: false,
                  total_installments: !prev.has_installments ? '' : '',
                  current_installment: !prev.has_installments ? '' : '',
                  date: !prev.has_installments ? today : ''
                }));
              }}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    id="has_installments"
                    name="has_installments"
                    checked={formData.has_installments}
                    onChange={() => {}}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkmark}></span>
                </div>
                <label htmlFor="has_installments" className={styles.optionLabel}>
                  <span className="material-icons">credit_card</span>
                  Parcelado
                </label>
              </div>

              {formData.has_installments && (
                <div className={styles.optionContent}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>
                      <span className="material-icons">format_list_numbered</span>
                      Número de Parcelas
                    </label>
                    <input
                      type="text"
                      name="total_installments"
                      value={formData.total_installments}
                      onChange={handleChange}                      
                      max="100"
                      className={styles.input}
                      required={formData.has_installments}
                      placeholder="Ex: 12"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>
                      <span className="material-icons">filter_1</span>
                      Qual parcela você está pagando?
                    </label>
                    <input
                      type="text"
                      name="current_installment"
                      value={formData.current_installment}
                      onChange={handleChange}                      
                      max={formData.total_installments}
                      className={styles.input}
                      required={formData.has_installments}
                      placeholder="Ex: 1"
                    />
                    {formData.amount && formData.total_installments > 1 && (
                      <small className={styles.installmentInfo}>
                        {formData.total_installments}x de {formatCurrency(formData.amount / formData.total_installments)}
                        <br />
                        {getInstallmentMessage(formData.total_installments, formData.current_installment)}
                      </small>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={`${styles.paymentOption} ${formData.is_in_cash ? styles.active : ''}`}>
              <div className={styles.optionHeader} onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  is_in_cash: !prev.is_in_cash,
                  is_recurring: false,
                  has_installments: false
                }));
              }}>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    id="is_in_cash"
                    name="is_in_cash"
                    checked={formData.is_in_cash}
                    onChange={() => {}}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkmark}></span>
                </div>
                <label htmlFor="is_in_cash" className={styles.optionLabel}>
                  <span className="material-icons">payments</span>
                  À Vista
                </label>
              </div>
            </div>
          </div>

          {!formData.is_recurring && !formData.has_installments && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <span className="material-icons">calendar_today</span>
                Data {formData.is_in_cash && '*'}
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={styles.input}
                required={formData.is_in_cash}
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

          <div className={styles.paymentMethodGroup}>
            <label className={styles.label}>
              <span className="material-icons">payments</span>
              Forma de Pagamento
            </label>
            <div className={styles.paymentButtons}>
              <button
                type="button"
                className={`${styles.paymentButton} ${formData.payment_method === 'credit_card' || formData.payment_method === 'debit_card' ? styles.active : ''}`}
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    payment_method: prev.card_type
                  }));
                }}
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
              <button
                type="button"
                className={`${styles.paymentButton} ${formData.payment_method === 'money' ? styles.active : ''}`}
                onClick={() => handlePaymentMethod('money')}
              >
                <span className="material-icons" style={{ color: 'var(--primary-color)' }}>payments</span>
                <span>Dinheiro</span>
              </button>
            </div>
          </div>

          {(formData.payment_method === 'credit_card' || formData.payment_method === 'debit_card') && (
            <div className={styles.paymentMethodGroup}>
              <label className={styles.label}>
                <span className="material-icons">credit_card</span>
                Tipo de Cartão
              </label>
              <div className={styles.paymentButtons}>
                <button
                  type="button"
                  className={`${styles.paymentButton} ${formData.card_type === 'credit_card' ? styles.active : ''}`}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      card_type: 'credit_card',
                      payment_method: 'credit_card'
                    }));
                  }}
                >
                  <BsCreditCard2Front size={32} className={styles.cardIcon} />
                  <span>Crédito</span>
                </button>
                <button
                  type="button"
                  className={`${styles.paymentButton} ${formData.card_type === 'debit_card' ? styles.active : ''}`}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      card_type: 'debit_card',
                      payment_method: 'debit_card'
                    }));
                  }}
                >
                  <BsCreditCard2Front size={32} className={styles.cardIcon} />
                  <span>Débito</span>
                </button>
              </div>
            </div>
          )}

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
