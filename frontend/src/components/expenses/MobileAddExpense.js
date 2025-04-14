import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import addExpenseStyles from '../../styles/mobile/addIncomeAndExpense.mobile.module.css';
import CurrencyInput from 'react-currency-input-field';
import {  
  BsCurrencyDollar, 
  BsCalendar3, 
  BsCheck2, 
  BsXLg,
  BsFolderSymlink,
  BsBank2,
  BsRepeat,
  BsCreditCard2Front,
  BsCash,
  BsWallet2,
  BsListCheck
} from 'react-icons/bs';
import { format } from 'date-fns';


const MobileAddExpense = ({ installment = false }) => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const initialFormData = {
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    is_recurring: false,
    frequency: 'monthly',
    recurrence_end_date: '',
    has_installments: installment,
    total_installments: installment ? 2 : 1,
    current_installment: installment ? 1 : 1,
    payment_method: 'credit_card',
    bankId: '',
  };
  const [formData, setFormData] = useState(initialFormData);
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [activeExpenseType, setActiveExpenseType] = useState('regular');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Obter um token válido, tentando primeiro o contexto e depois localStorage
        let token = auth.token;
        if (!token) {
          console.log('Token não encontrado no contexto, buscando do localStorage...');
          token = localStorage.getItem('token');
          if (!token) {
            console.error('Nenhum token de autenticação encontrado');
            navigate('/login');
            return;
          }
        }
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Verificar se a resposta parece ser HTML (possível página de erro 502)
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        
        // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
        if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
          console.error('Resposta de categorias contém HTML. Possível erro 502 Bad Gateway.');
          console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
          throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
        }
        
        if (!response.ok) {
          let errorMessage = 'Falha ao carregar categorias';
          try {
            // Parsear o JSON manualmente já que usamos text() acima
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Se não puder parsear como JSON, usar o texto de status
            errorMessage = `${errorMessage}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // Parsear o JSON manualmente já que usamos text() acima
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
        
        setCategories(data);
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
        setError(err.message || 'Erro ao carregar categorias. Por favor, tente novamente.');
      }
    };

    fetchCategories();
  }, [auth.token, navigate]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        // Obter um token válido, tentando primeiro o contexto e depois localStorage
        let token = auth.token;
        if (!token) {
          console.log('Token não encontrado no contexto, buscando do localStorage...');
          token = localStorage.getItem('token');
          if (!token) {
            console.error('Nenhum token de autenticação encontrado');
            navigate('/login');
            return;
          }
        }
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Verificar se a resposta parece ser HTML (possível página de erro 502)
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        
        // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
        if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
          console.error('Resposta de bancos contém HTML. Possível erro 502 Bad Gateway.');
          console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
          throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
        }
        
        if (!response.ok) {
          let errorMessage = 'Falha ao carregar bancos';
          try {
            // Parsear o JSON manualmente já que usamos text() acima
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Se não puder parsear como JSON, usar o texto de status
            errorMessage = `${errorMessage}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // Parsear o JSON manualmente já que usamos text() acima
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
        
        setBanks(data);
      } catch (err) {
        console.error('Erro ao carregar bancos:', err);
        setError(err.message || 'Erro ao carregar bancos. Por favor, tente novamente.');
      }
    };

    fetchBanks();
  }, [auth.token, navigate]);

  useEffect(() => {
    if (installment) {
      setFormData(prev => ({
        ...prev,
        has_installments: true,
        is_recurring: false
      }));
      setActiveExpenseType('installments');
    }
  }, [installment]);

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
    setLoading(true);

    try {
      // Verificar se os campos obrigatórios estão preenchidos
      if (!formData.description || !formData.amount || !formData.categoryId || !formData.bankId) {
        throw new Error('Preencha todos os campos obrigatórios: descrição, valor, categoria e banco');
      }

      if (!formData.payment_method) {
        throw new Error('Selecione uma forma de pagamento (Crédito, Débito, Dinheiro ou Pix)');
      }

      // Validação da data para pagamento à vista
      if (!formData.is_recurring && !formData.has_installments) {
        const expenseDate = new Date(formData.expense_date);
        if (isNaN(expenseDate.getTime())) {
          throw new Error('A data da despesa é obrigatória para pagamento único');
        }
      }

      // Informe o usuário que o valor inserido é o valor da parcela e não o total
      let amount = formData.amount;

      // Validações específicas para pagamento parcelado
      if (formData.has_installments) {
        // Validação do número de parcelas
        if (!formData.total_installments) {
          throw new Error('O número total de parcelas é obrigatório');
        }
        if (formData.total_installments < 2) {
          throw new Error('O número total de parcelas deve ser no mínimo 2');
        }
        if (formData.total_installments > 100) {
          throw new Error('O número total de parcelas não pode ser maior que 100');
        }

        // Validação da parcela atual
        if (!formData.current_installment) {
          throw new Error('O número da parcela atual é obrigatório');
        }
        if (formData.current_installment < 1) {
          throw new Error('O número da parcela atual deve ser no mínimo 1');
        }
        if (formData.current_installment > formData.total_installments) {
          throw new Error('O número da parcela atual não pode ser maior que o total de parcelas');
        }

        // Validação da data para pagamento parcelado
        const expenseDate = new Date(formData.expense_date);
        if (isNaN(expenseDate.getTime())) {
          throw new Error('A data da parcela atual é obrigatória');
        }
        
        // Verifica se o amount é uma string e converte para número se necessário
        if (typeof amount === 'string' && amount) {
          // Remove caracteres não numéricos exceto pontos e vírgulas
          amount = amount.replace(/[^\d,.]/g, '');
          // Substitui vírgula por ponto para conversão correta
          amount = amount.replace(',', '.');
          // Converte para número
          amount = parseFloat(amount);
        }
        
        // Se após a conversão o valor não for um número válido, usa 0
        if (isNaN(amount)) {
          amount = 0;
        }
      }

      const dataToSend = {
        description: formData.description,
        amount: amount,
        category_id: parseInt(formData.categoryId),
        bank_id: parseInt(formData.bankId),
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        has_installments: Boolean(formData.has_installments),
        is_recurring: Boolean(formData.is_recurring),
        is_in_cash: !formData.is_recurring && !formData.has_installments,
        current_installment: formData.has_installments ? parseInt(formData.current_installment) : null,
        total_installments: formData.has_installments ? parseInt(formData.total_installments) : null,
        recurrence_type: formData.is_recurring ? formData.frequency : null,
        user_id: auth.user?.id
      };

      console.log('Enviando dados:', JSON.stringify(dataToSend, null, 2));

      // Obter um token válido, tentando primeiro o contexto e depois localStorage
      let token = auth.token;
      if (!token) {
        console.log('Token não encontrado no contexto, buscando do localStorage para handleSubmit...');
        token = localStorage.getItem('token');
        if (!token) {
          console.error('Nenhum token de autenticação encontrado para handleSubmit');
          navigate('/login');
          return;
        }
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });

      // Verificar se a resposta parece ser HTML (possível página de erro 502)
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
      if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
        console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
        console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
        throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
      }

      if (!response.ok) {
        // Parsear o JSON manualmente já que usamos text() acima
        try {
          const errorData = JSON.parse(responseText);
          console.error('Erro da API:', errorData);
          throw new Error(errorData.message || 'Falha ao adicionar despesa');
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta de erro:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
      }

      // Parsear o JSON manualmente já que usamos text() acima
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON da resposta:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }
      
      console.log('Resposta do servidor:', result);

      setSuccess('Despesa adicionada com sucesso!');
      setTimeout(() => {
        navigate('/expenses');
      }, 2000);
    } catch (err) {
      console.error('Erro completo:', err);
      setError(err.message || 'Erro ao adicionar despesa. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatPluralText = (number, singular, plural) => {
    return `${number} ${number === 1 ? singular : plural}`;
  };

  const getInstallmentMessage = (total, current) => {
    if (current === total) {
      return `Esta é a última parcela de ${total}`;
    } else {
      const restantes = total - current;
      return `Serão registradas apenas ${formatPluralText(restantes, 'a parcela restante', 'as ' + restantes + ' parcelas restantes')} a partir desta`;
    }
  };

  return (
    <>
      <div className={addExpenseStyles.modalOverlay}>
        <div className={`${addExpenseStyles.modalContent} ${addExpenseStyles.formModal}`}>
          <div className={addExpenseStyles.modalHeader}>
            <h2>Adicionar Despesa</h2>
          </div>

          {error && (
            <div className={addExpenseStyles.errorCard}>
              <div className={addExpenseStyles.errorIcon}>!</div>
              <div className={addExpenseStyles.errorMessage}>{error}</div>
              <button 
                className={addExpenseStyles.errorRetryButton}
                onClick={() => setError(null)}
              >
                Tentar Novamente
              </button>
            </div>
          )}
          
          {success && (
            <div className={addExpenseStyles.successMessage}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className={addExpenseStyles.formGrid}>
            {/* Tipo de Despesa */}
            <div className={addExpenseStyles.formGroup}>
              <label className={addExpenseStyles.formLabel}>
                Tipo de Despesa
              </label>
              <div className={addExpenseStyles.toggleGroup}>
                <button
                  type="button"
                  className={`${addExpenseStyles.toggleButton} ${!formData.is_recurring && !formData.has_installments ? addExpenseStyles.active : ''}`}
                  onClick={() => handleToggleChange('normal')}
                >
                  <BsCurrencyDollar style={{color: !formData.is_recurring && !formData.has_installments ? 'var(--secondary-color)' : 'white'}} /> 
                  <span style={{color: !formData.is_recurring && !formData.has_installments ? 'var(--secondary-color)' : 'white'}}>Único</span>
                </button>
                <button
                  type="button"
                  className={`${addExpenseStyles.toggleButton} ${formData.has_installments ? addExpenseStyles.active : ''}`}
                  onClick={() => handleToggleChange('installments')}
                >
                  <BsListCheck style={{color: formData.has_installments ? 'var(--secondary-color)' : 'white'}} /> 
                  <span style={{color: formData.has_installments ? 'var(--secondary-color)' : 'white'}}>Parcelado</span>
                </button>
                <button
                  type="button"
                  className={`${addExpenseStyles.toggleButton} ${formData.is_recurring ? addExpenseStyles.active : ''}`}
                  onClick={() => handleToggleChange('recurring')}
                >
                  <BsRepeat style={{color: formData.is_recurring ? 'var(--secondary-color)' : 'white'}} /> 
                  <span style={{color: formData.is_recurring ? 'var(--secondary-color)' : 'white'}}>Fixo</span>
                </button>
              </div>
            </div>

            <div className={addExpenseStyles.inlineFieldsContainer}>
              <div className={addExpenseStyles.formGroup}>
                <label className={addExpenseStyles.formLabel}>
                  Descrição
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={addExpenseStyles.formInput}
                  required
                />
              </div>

              <div className={addExpenseStyles.formGroup}>
                <label className={addExpenseStyles.formLabel}>
                  Valor
                </label>
                <CurrencyInput
                  name="amount"
                  value={formData.amount}
                  placeholder="R$ 0,00"
                  decimalsLimit={2}
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      amount: value
                    }));
                  }}
                  intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                  className={addExpenseStyles.formInput}
                  required
                />
              </div>
            </div>

            {/* Data para Despesa Única */}
            {!formData.is_recurring && (
              <div className={addExpenseStyles.formGroup}>
                <label className={addExpenseStyles.formLabel}>
                  Data
                </label>
                <div className={addExpenseStyles.inputWithIcon}>
                  <BsCalendar3 className={addExpenseStyles.inputIcon} />
                  <input
                    type="date"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleChange}
                    className={addExpenseStyles.formInput}
                    required
                  />
                </div>
              </div>
            )}

            {/* Configurações de Despesa Fixa */}
            {formData.is_recurring && (
              <div style={{marginBottom: '20px'}}>
                <label className={addExpenseStyles.formLabel}>
                  <div className={`${addExpenseStyles.typeStatus} ${addExpenseStyles.fixedType}`}>
                    <BsRepeat /> Despesa fixa
                  </div>
                </label>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '10px'}}>
                  <div className={addExpenseStyles.formGroup}>
                    <label className={addExpenseStyles.formLabel}>Data de Início</label>
                    <input
                      type="date"
                      name="expense_date"
                      value={formData.expense_date}
                      onChange={handleChange}
                      className={addExpenseStyles.formInput}
                      required
                    />
                  </div>
                  
                  <div className={addExpenseStyles.formGroup}>
                    <label className={addExpenseStyles.formLabel}>Tipo de Recorrência</label>
                    <select
                      name="frequency"
                      value={formData.frequency || 'monthly'}
                      onChange={handleChange}
                      className={addExpenseStyles.formInput}
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

            {/* Categoria e Banco em duas colunas */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
              <div className={addExpenseStyles.formGroup}>
                <label className={addExpenseStyles.formLabel}>
                  <BsFolderSymlink size={16} /> Categoria
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  className={addExpenseStyles.formInput}
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

              <div className={addExpenseStyles.formGroup}>
                <label className={addExpenseStyles.formLabel}>
                  <BsBank2 size={16} /> Banco
                </label>
                {banks.length > 0 ? (
                  <select
                    name="bankId"
                    value={formData.bankId}
                    onChange={handleChange}
                    className={addExpenseStyles.formInput}
                    required
                  >
                    <option value="">Selecione um banco</option>
                    {banks.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={addExpenseStyles.emptySelectError}>
                    Erro ao carregar bancos. Por favor, tente novamente.
                  </div>
                )}
              </div>
            </div>

            {/* Método de Pagamento */}
            <div className={addExpenseStyles.formGroup}>
              <label className={addExpenseStyles.formLabel}>
                <BsCreditCard2Front size={16} /> Método de Pagamento
              </label>
              <div className={addExpenseStyles.toggleGroup}>
                <button
                  type="button"
                  className={`${addExpenseStyles.toggleButton} ${formData.payment_method === 'credit_card' ? addExpenseStyles.active : ''}`}
                  onClick={() => handlePaymentMethodChange('credit_card')}
                >
                  <BsCreditCard2Front style={{color: formData.payment_method === 'credit_card' ? 'var(--secondary-color)' : 'white'}} /> 
                  <span style={{color: formData.payment_method === 'credit_card' ? 'var(--secondary-color)' : 'white'}}>Crédito</span>
                </button>
                <button
                  type="button"
                  className={`${addExpenseStyles.toggleButton} ${formData.payment_method === 'debit_card' ? addExpenseStyles.active : ''}`}
                  onClick={() => handlePaymentMethodChange('debit_card')}
                >
                  <BsCreditCard2Front style={{color: formData.payment_method === 'debit_card' ? 'var(--secondary-color)' : 'white'}} /> 
                  <span style={{color: formData.payment_method === 'debit_card' ? 'var(--secondary-color)' : 'white'}}>Débito</span>
                </button>
                <button
                  type="button"
                  className={`${addExpenseStyles.toggleButton} ${formData.payment_method === 'pix' ? addExpenseStyles.active : ''}`}
                  onClick={() => handlePaymentMethodChange('pix')}
                >
                  <BsCash style={{color: formData.payment_method === 'pix' ? 'var(--secondary-color)' : 'white'}} /> 
                  <span style={{color: formData.payment_method === 'pix' ? 'var(--secondary-color)' : 'white'}}>PIX</span>
                </button>
                <button
                  type="button"
                  className={`${addExpenseStyles.toggleButton} ${formData.payment_method === 'money' ? addExpenseStyles.active : ''}`}
                  onClick={() => handlePaymentMethodChange('money')}
                >
                  <BsCash style={{color: formData.payment_method === 'money' ? 'var(--secondary-color)' : 'white'}} /> 
                  <span style={{color: formData.payment_method === 'money' ? 'var(--secondary-color)' : 'white'}}>Dinheiro</span>
                </button>
              </div>
            </div>

            {/* Configurações de Parcelas */}
            {formData.has_installments && (
              <div style={{marginBottom: '20px'}}>
                <label className={addExpenseStyles.formLabel}>
                  <div className={`${addExpenseStyles.typeStatus} ${addExpenseStyles.installmentType}`}>
                    <BsListCheck /> Despesa Parcelada
                  </div>
                </label>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '10px'}}>
                  <div className={addExpenseStyles.formGroup}>
                    <label className={addExpenseStyles.formLabel}>Data da Parcela Atual</label>
                    <input
                      type="date"
                      name="expense_date"
                      value={formData.expense_date}
                      onChange={handleChange}
                      className={addExpenseStyles.formInput}
                      required
                    />
                  </div>
                  
                  <div className={addExpenseStyles.formGroup}>
                    <label className={addExpenseStyles.formLabel}>Parcela Atual / Total</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      <input
                        type="number"
                        min="1"
                        max={formData.total_installments}
                        name="current_installment"
                        value={formData.current_installment}
                        onChange={handleChange}
                        className={addExpenseStyles.formInput}
                        style={{width: '45%'}}
                        required
                      />
                      <span style={{margin: '0 5px'}}>/</span>
                      <input
                        type="number"
                        min={formData.current_installment}
                        max="60"
                        name="total_installments"
                        value={formData.total_installments}
                        onChange={handleChange}
                        className={addExpenseStyles.formInput}
                        style={{width: '45%'}}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className={addExpenseStyles.modalActions}>
              <button 
                type="button" 
                className={`${addExpenseStyles.formButton} ${addExpenseStyles.formCancel}`}
                onClick={() => navigate('/expenses')}
              >
                <BsXLg /> Cancelar
              </button>
              <button 
                type="submit" 
                className={`${addExpenseStyles.formButton} ${addExpenseStyles.formSubmit}`}
                disabled={loading}
              >
                <BsCheck2 /> {loading ? 'Salvando...' : 'Salvar Despesa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default MobileAddExpense;