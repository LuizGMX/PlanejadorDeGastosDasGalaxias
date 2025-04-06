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
  BsWallet2,
  BsListCheck
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
  const [loading, setLoading] = useState(false);

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
      if (!formData.description || !formData.amount || !formData.category_id || !formData.bank_id) {
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

      // Validação para despesas recorrentes
      if (formData.is_recurring) {
        const startDate = new Date(formData.start_date || formData.expense_date);
        
        if (isNaN(startDate.getTime())) {
          throw new Error('A data inicial da recorrência é inválida');
        }
      }

      // Não calculamos mais o valor da parcela - usamos diretamente o valor informado
      // Para parcelas, o amount já é o valor de cada parcela

      // Não precisamos mais calcular a data da primeira parcela, pois só registramos
      // as parcelas a partir da atual

      const dataToSend = {
        description: formData.description,
        amount: amount,
        category_id: parseInt(formData.category_id),
        bank_id: parseInt(formData.bank_id),
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        has_installments: Boolean(formData.has_installments),
        is_recurring: Boolean(formData.is_recurring),
        is_in_cash: !formData.is_recurring && !formData.has_installments,
        current_installment: formData.has_installments ? parseInt(formData.current_installment) : null,
        total_installments: formData.has_installments ? parseInt(formData.total_installments) : null,
        recurrence_type: formData.is_recurring ? formData.recurrence_type : null,
        user_id: auth.user?.id // Garante que o ID do usuário está incluído
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
    <div className={dataTableStyles.modalOverlay}>
      <div className={`${dataTableStyles.modalContent} ${dataTableStyles.formModal}`}>
        <div className={dataTableStyles.modalHeader}>
          <BsPlusCircle size={20} style={{ color: 'var(--primary-color)' }} />
          <h3>Adicionar Despesa</h3>
        </div>

        {error && (
          <div className={dataTableStyles.errorCard}>
            <div>
              <div className={dataTableStyles.errorIcon}>!</div>
              <p className={dataTableStyles.errorMessage}>{error}</p>
            </div>
            <button 
              type="button" 
              className={dataTableStyles.errorRetryButton}
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </button>
          </div>
        )}
        
        {success && (
          <div className={sharedStyles.successMessage}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className={dataTableStyles.formGrid}>
          <div className={dataTableStyles.inlineFieldsContainer}>
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
                {formData.has_installments ? 'Valor Total da Compra (calcularemos o valor de cada parcela automaticamente)' : 'Valor'}
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
                className={dataTableStyles.formInput}
                required
              />
            </div>
          </div>

          {/* Tipo de Despesa */}
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
                className={`${dataTableStyles.toggleButton} ${formData.is_recurring ? dataTableStyles.active : ''}`}
                onClick={() => handleToggleChange('recurring')}
              >
                <BsRepeat /> Fixa
              </button>
            </div>
          </div>

          {/* Data para Despesa Única */}
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

          {/* Configurações de Parcelas */}
          {formData.has_installments && (
            <div style={{marginBottom: '20px'}}>
              <label className={dataTableStyles.formLabel}>
                <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.installmentType}`}>
                  <BsListCheck /> Despesa Parcelada
                </div>
              </label>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '10px'}}>
                <div className={dataTableStyles.formGroup}>
                  <label className={dataTableStyles.formLabel}>Data da Parcela Atual</label>
                  <input
                    type="date"
                    name="expense_date"
                    value={formData.expense_date}
                    onChange={handleChange}
                    className={dataTableStyles.formInput}
                    required
                  />
                </div>
                
                <div className={dataTableStyles.formGroup}>
                  <label className={dataTableStyles.formLabel}>Parcela Atual / Total</label>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <input
                      type="number"
                      min="1"
                      max={formData.total_installments}
                      name="current_installment"
                      value={formData.current_installment}
                      onChange={handleChange}
                      className={dataTableStyles.formInput}
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
                      className={dataTableStyles.formInput}
                      style={{width: '45%'}}
                      required
                    />
                  </div>
                </div>
              </div>             
            </div>
          )}

          {/* Configurações de Despesa Fixa */}
          {formData.is_recurring && !formData.has_installments && (
            <div style={{marginBottom: '20px'}}>
              <label className={dataTableStyles.formLabel}>
                <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                  <BsRepeat /> Despesa Fixa
                </div>
              </label>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '10px'}}>
                <div className={dataTableStyles.formGroup}>
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
                
                <div className={dataTableStyles.formGroup}>
                  <label className={dataTableStyles.formLabel}>Tipo de Recorrência</label>
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

          {/* Categoria e Banco/Carteira em duas colunas */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
            <div className={dataTableStyles.formGroup}>
              <label className={dataTableStyles.formLabel}>
                <BsFolderSymlink size={16} /> Categoria
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
                <BsBank2 size={16} /> Banco/Carteira
              </label>
              {banks.length > 0 ? (
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
              ) : (
                <div className={dataTableStyles.emptySelectError}>
                  Erro ao carregar bancos. Por favor, tente novamente.
                </div>
              )}
            </div>
          </div>

          {/* Forma de Pagamento */}
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

          {/* Botões de Ação */}
          <div className={dataTableStyles.modalActions}>
            <button 
              type="button" 
              onClick={() => navigate('/expenses')} 
              className={`${dataTableStyles.formButton} ${dataTableStyles.formCancel}`}
            >
              <BsXLg /> Cancelar
            </button>
            <button 
              type="submit" 
              className={`${dataTableStyles.formButton} ${dataTableStyles.formSubmit}`}
              disabled={loading}
            >
              <BsCheck2 /> {loading ? 'Salvando...' : 'Salvar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;