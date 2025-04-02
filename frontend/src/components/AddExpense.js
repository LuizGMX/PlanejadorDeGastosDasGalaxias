import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import dataTableStyles from '../styles/dataTable.module.css';
import sharedStyles from '../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';
import { 
  BsPlusCircle, 
  BsCurrencyDollar, 
  BsCalendar3, 
  BsCheck2, 
  BsXLg,
  BsFolderSymlink,
  BsBank2,
  BsRepeat,
  BsCreditCard2Front,
  BsCashCoin,
  BsWallet2
} from 'react-icons/bs';
import { SiPix } from 'react-icons/si';


const AddExpense = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category_id: '',
    bank_id: '',
    payment_method: '',
    card_type: '',
    is_recurring: false,
    has_installments: false,
    start_date: null,
    recurrence_type: 'monthly',
    total_installments: 2,
    current_installment: 1
  });
  const [categories, setCategories] = useState([]);
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
      payment_method: method,
      card_type: method === 'credit_card' || method === 'debit_card' ? method : ''
    }));
  };

  const handlePaymentMethodChange = (method) => {
    setFormData(prev => ({
      ...prev,
      payment_method: method
    }));
  };

  const handleToggleChange = (type) => {
    switch(type) {
      case 'normal':
        setFormData(prev => ({
          ...prev,
          is_recurring: false,
          has_installments: false,
          expense_date: prev.expense_date || new Date().toISOString().split('T')[0]
        }));
        break;
      case 'installments':
        setFormData(prev => ({
          ...prev,
          is_recurring: false,
          has_installments: true,
          total_installments: prev.total_installments || 2,
          expense_date: prev.expense_date || new Date().toISOString().split('T')[0]
        }));
        break;
      case 'recurring':
        setFormData(prev => ({
          ...prev,
          is_recurring: true,
          has_installments: false,
          start_date: prev.start_date || new Date().toISOString().split('T')[0],
          end_date: prev.end_date || ''
        }));
        break;
      default:
        break;
    }
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
      // Validação da data para pagamento à vista
      if (!formData.is_recurring && !formData.has_installments) {
        const expenseDate = new Date(formData.expense_date);
        if (isNaN(expenseDate.getTime())) {
          throw new Error('A data da despesa é obrigatória para pagamento único');
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
        if (formData.current_installment !== undefined && formData.current_installment !== '') {
          if (formData.current_installment < 1) {
            throw new Error('O número da parcela atual deve ser no mínimo 1');
          }
          if (formData.current_installment > formData.total_installments) {
            throw new Error('O número da parcela atual não pode ser maior que o total de parcelas');
          }
        }

        // Validação da data para pagamento parcelado
        const expenseDate = new Date(formData.expense_date);
        if (isNaN(expenseDate.getTime())) {
          throw new Error('A data da despesa é obrigatória para pagamento parcelado');
        }
      }

      // Validação para despesas recorrentes
      if (formData.is_recurring) {
        const startDate = new Date(formData.start_date || formData.expense_date);
        
        if (isNaN(startDate.getTime())) {
          throw new Error('A data inicial da recorrência é inválida');
        }

        // Inclui a data inicial na criação da despesa recorrente
        formData.start_date = formData.start_date || formData.expense_date;
      }

      // Prepara os dados para envio
      const baseDate = new Date(formData.expense_date);

      // Calcula o valor da parcela se for pagamento parcelado
      const totalAmount = parseFloat(formData.amount);
      const installmentAmount = formData.has_installments
        ? (totalAmount / formData.total_installments).toFixed(2)
        : totalAmount;

      // Calcula a data da primeira parcela
      let first_installment_date = formData.expense_date;
      if (formData.has_installments && formData.current_installment && formData.current_installment > 1) {
        const firstDate = new Date(baseDate);
        firstDate.setMonth(firstDate.getMonth() - (formData.current_installment - 1));
        first_installment_date = firstDate.toISOString().split('T')[0];
      }

      // Define as datas para despesas fixas
      let start_date = null;
      let end_date = null;
      if (formData.is_recurring) {        
        start_date = formData.start_date || formData.expense_date;
      }

      const dataToSend = {
        ...formData,
        amount: installmentAmount,
        first_installment_date,
        expense_date: formData.expense_date,
        start_date,
        end_date: null,
        recurrence_type: formData.is_recurring ? formData.recurrence_type : null
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
    <div className={dataTableStyles.modalOverlay}>
      <div className={`${dataTableStyles.modalContent} ${dataTableStyles.formModal}`}>
        <div className={dataTableStyles.modalHeader}>
          <BsPlusCircle size={20} style={{ color: 'var(--primary-color)' }} />
          <h3>Adicionar Despesa</h3>
        </div>

        {error && <p className={dataTableStyles.errorMessage}>{error}</p>}
        {success && (
          <div className={sharedStyles.successMessage}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className={dataTableStyles.formGrid}>
          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              Descrição
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={dataTableStyles.formInput}
              required
            />
          </div>

          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              Valor
            </label>
            <div className={dataTableStyles.inputWithIcon}>
              <BsCurrencyDollar className={dataTableStyles.inputIcon} />
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
                className={dataTableStyles.formInput}
                required
              />
            </div>
          </div>

          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              Tipo de Despesa
            </label>
            <div className={dataTableStyles.toggleGroup}>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${!formData.is_recurring && !formData.has_installments ? dataTableStyles.active : ''}`}
                onClick={() => handleToggleChange('normal')}
              >
                <BsCurrencyDollar /> Única
              </button>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${formData.has_installments ? dataTableStyles.active : ''}`}
                onClick={() => handleToggleChange('installments')}
              >
                <BsListCheck /> Parcelada
              </button>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${formData.is_recurring && !formData.has_installments ? dataTableStyles.active : ''}`}
                onClick={() => handleToggleChange('recurring')}
              >
                <BsRepeat /> Fixa
              </button>
            </div>
          </div>

          {!formData.is_recurring && !formData.has_installments && (
            <div className={dataTableStyles.formGroup}>
              <label className={dataTableStyles.formLabel}>
                Data
              </label>
              <div className={dataTableStyles.inputWithIcon}>
                <BsCalendar3 className={dataTableStyles.inputIcon} />
                <input
                  type="date"
                  name="expense_date"
                  value={formData.expense_date}
                  onChange={handleChange}
                  className={dataTableStyles.formInput}
                  required
                />
              </div>
            </div>
          )}

          {formData.has_installments && (
            <div className={dataTableStyles.formGroup}>
              <label className={dataTableStyles.formLabel}>
                <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.installmentType}`}>
                  <BsListCheck /> Despesa Parcelada
                </div>
              </label>
              <div className={dataTableStyles.formGroupRow}>
                <div className={dataTableStyles.formGroupHalf}>
                  <label className={dataTableStyles.formLabel}>Data da Primeira Parcela</label>
                  <input
                    type="date"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleChange}
                    className={dataTableStyles.formInput}
                    required
                  />
                </div>
                
                <div className={dataTableStyles.formGroupHalf}>
                  <label className={dataTableStyles.formLabel}>Número de Parcelas</label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    name="total_installments"
                    value={formData.total_installments}
                    onChange={handleChange}
                    className={dataTableStyles.formInput}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {formData.is_recurring && !formData.has_installments && (
            <div className={dataTableStyles.formGroup}>
              <label className={dataTableStyles.formLabel}>
                <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                  <BsRepeat /> Despesa Fixa
                </div>
              </label>
              <div className={dataTableStyles.formGroupRow}>
                <div className={dataTableStyles.formGroupHalf}>
                  <label className={dataTableStyles.formLabel}>Data de Início</label>
                  <input
                    type="date"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleChange}
                    className={dataTableStyles.formInput}
                    required
                  />
                </div>
                
                <div className={dataTableStyles.formGroupHalf}>
                  <label className={dataTableStyles.formLabel}>Periodicidade</label>
                  <select
                    name="recurrence_type"
                    value={formData.recurrence_type || 'monthly'}
                    onChange={handleChange}
                    className={dataTableStyles.formInput}
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
            </div>
          )}

          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              <BsFolderSymlink /> Categoria
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className={dataTableStyles.formInput}
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

          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              <BsBank2 /> Banco/Carteira
            </label>
            <select
              name="bank_id"
              value={formData.bank_id}
              onChange={handleChange}
              className={dataTableStyles.formInput}
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

          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              Forma de Pagamento
            </label>
            <div className={dataTableStyles.toggleGroup}>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${formData.payment_method === 'credit_card' ? dataTableStyles.active : ''}`}
                onClick={() => handlePaymentMethodChange('credit_card')}
              >
                <BsCreditCard2Front /> Crédito
              </button>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${formData.payment_method === 'debit_card' ? dataTableStyles.active : ''}`}
                onClick={() => handlePaymentMethodChange('debit_card')}
              >
                <BsCreditCard2Front /> Débito
              </button>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${formData.payment_method === 'cash' ? dataTableStyles.active : ''}`}
                onClick={() => handlePaymentMethodChange('cash')}
              >
                <BsCashCoin /> Dinheiro
              </button>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${formData.payment_method === 'pix' ? dataTableStyles.active : ''}`}
                onClick={() => handlePaymentMethodChange('pix')}
              >
                <BsWallet2 /> Pix
              </button>
            </div>
          </div>

          <div className={dataTableStyles.modalActions}>
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className={`${dataTableStyles.formButton} ${dataTableStyles.formCancel}`}
            >
              <BsXLg /> Cancelar
            </button>
            <button 
              type="submit" 
              className={`${dataTableStyles.formButton} ${dataTableStyles.formSubmit}`}
            >
              <BsCheck2 /> Salvar Despesa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;