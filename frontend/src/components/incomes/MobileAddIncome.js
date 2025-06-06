import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import dataTableStyles from '../../styles/dataTable.module.css';
import sharedStyles from '../../styles/shared.module.css';
import addIncomeStyles from '../../styles/mobile/addIncomeAndExpense.mobile.module.css';
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
  BsListCheck
} from 'react-icons/bs';

const MobileAddIncome = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    bank_id: '',
    is_recurring: false,
    start_date: null,
    recurrence_type: 'monthly'
  });
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/categories`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
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

    fetchCategories();
    fetchBanks();
  }, [auth.token, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

   if (name === 'date' || name === 'start_date') {
      // Formata a data para o formato correto
      const formattedDate = value ? value.split('T')[0] : '';
      setFormData(prev => ({
        ...prev,
        [name]: formattedDate
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleToggleChange = (type) => {
    switch(type) {
      case 'normal':
        setFormData(prev => ({
          ...prev,
          is_recurring: false,        
          date: prev.date || new Date().toISOString().split('T')[0]
        }));
        break;
      case 'recurring':
        setFormData(prev => ({
          ...prev,
          is_recurring: true,          
          start_date: prev.start_date || new Date().toISOString().split('T')[0],
          date: prev.date || new Date().toISOString().split('T')[0]
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
      // Verifica se todos os campos obrigatórios estão preenchidos
      if (!formData.description || !formData.amount || !formData.category_id || !formData.bank_id) {
        throw new Error('Preencha todos os campos obrigatórios: descrição, valor, categoria e banco');
      }

      const requestData = {
        description: formData.description,
        amount: formData.amount,
        category_id: parseInt(formData.category_id),
        income_date: formData.date,
        bank_id: parseInt(formData.bank_id),
        payment_method: 'transfer', // Método de pagamento padrão para receitas
        is_recurring: formData.is_recurring
      };

      // Adicionando informações específicas de recorrência quando é receita recorrente
      if (formData.is_recurring) {
        requestData.recurrence_rule = {
          frequency: formData.recurrence_type || 'monthly',
          start_date: formData.date
        };
        requestData.recurrence_type = formData.recurrence_type || 'monthly';
      }

      console.log('Enviando dados:', JSON.stringify(requestData, null, 2));

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.status === 201) {
        setBanks((prevBanks) => {
          const updatedBanks = [...prevBanks];
          const bankIndex = updatedBanks.findIndex(
            (bank) => bank.id === formData.bank_id
          );
          
          if (bankIndex !== -1) {
            updatedBanks[bankIndex] = {
              ...updatedBanks[bankIndex],
              balance: Number(updatedBanks[bankIndex].balance) + Number(formData.amount),
            };
          }
          
          return updatedBanks;
        });

        // Atualizar a UI após a criação bem-sucedida
        setSuccess('Receita adicionada com sucesso!');
        setTimeout(() => {
          navigate('/income');
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao adicionar receita:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao adicionar receita. Tente novamente.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={addIncomeStyles.modalOverlay}>
        <div className={`${addIncomeStyles.modalContent} ${addIncomeStyles.formModal}`}>
          <div className={addIncomeStyles.modalHeader}>
            <h2>Adicionar Receita</h2>
          </div>

          {error && (
            <div className={addIncomeStyles.errorCard}>
              <div className={addIncomeStyles.errorIcon}>!</div>
              <div className={addIncomeStyles.errorMessage}>{error}</div>
              <button 
                className={addIncomeStyles.errorRetryButton}
                onClick={() => setError(null)}
              >
                Tentar Novamente
              </button>
            </div>
          )}
          
          {success && (
            <div className={addIncomeStyles.successMessage}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className={addIncomeStyles.formGrid}>
            {/* Tipo de Receita */}
            <div className={addIncomeStyles.formGroup}>
              <label className={addIncomeStyles.formLabel}>
                Tipo de Receita
              </label>
              <div className={addIncomeStyles.toggleGroup}>
                <button
                  type="button"
                  className={`${addIncomeStyles.toggleButton} ${!formData.is_recurring ? addIncomeStyles.active : ''}`}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      is_recurring: false
                    }));
                  }}
                >
                  <BsCurrencyDollar style={{color: !formData.is_recurring ? 'var(--secondary-color)' : 'white'}} /> 
                  <span style={{color: !formData.is_recurring ? 'var(--secondary-color)' : 'white'}}>Único</span>
                </button>
                <button
                  type="button"
                  className={`${addIncomeStyles.toggleButton} ${formData.is_recurring ? addIncomeStyles.active : ''}`}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      is_recurring: true,
                    }));
                  }}
                >
                  <BsRepeat style={{color: formData.is_recurring ? 'var(--secondary-color)' : 'white'}} /> 
                  <span style={{color: formData.is_recurring ? 'var(--secondary-color)' : 'white'}}>Fixo</span>
                </button>
              </div>
            </div>

            {/* Descrição e Valor */}
            <div className={addIncomeStyles.inlineFieldsContainer}>
              <div className={addIncomeStyles.formGroup}>
                <label className={addIncomeStyles.formLabel}>
                  Descrição
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={addIncomeStyles.formInput}
                  required
                />
              </div>

              <div className={addIncomeStyles.formGroup}>
                <label className={addIncomeStyles.formLabel}>
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
                  className={addIncomeStyles.formInput}
                  required
                />
              </div>
            </div>

            {/* Categoria e Banco */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
              <div className={addIncomeStyles.formGroup}>
                <label className={addIncomeStyles.formLabel}>
                  <BsFolderSymlink size={16} /> Categoria
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className={addIncomeStyles.formInput}
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

              <div className={addIncomeStyles.formGroup}>
                <label className={addIncomeStyles.formLabel}>
                  <BsBank2 size={16} /> Banco
                </label>
                {banks.length > 0 ? (
                  <select
                    name="bank_id"
                    value={formData.bank_id}
                    onChange={handleChange}
                    className={addIncomeStyles.formInput}
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
                  <div className={addIncomeStyles.emptySelectError}>
                    Erro ao carregar bancos. Por favor, tente novamente.
                  </div>
                )}
              </div>
            </div>

            {/* Data para Receita Única */}
            {!formData.is_recurring && (
              <div className={addIncomeStyles.formGroup}>
                <label className={addIncomeStyles.formLabel}>
                  Data
                </label>
                <div className={addIncomeStyles.inputWithIcon}>
                  <BsCalendar3 className={addIncomeStyles.inputIcon} />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={addIncomeStyles.formInput}
                    required
                  />
                </div>
              </div>
            )}

            {/* Configurações de Receita Fixa */}
            {formData.is_recurring && (
              <div style={{marginBottom: '20px'}}>
                <label className={addIncomeStyles.formLabel}>
                  <div className={`${addIncomeStyles.typeStatus} ${addIncomeStyles.fixedType}`}>
                    <BsRepeat /> Receita Fixa
                  </div>
                </label>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '10px'}}>
                  <div className={addIncomeStyles.formGroup}>
                    <label className={addIncomeStyles.formLabel}>Data de Início</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className={addIncomeStyles.formInput}
                      required
                    />
                  </div>
                  
                  <div className={addIncomeStyles.formGroup}>
                    <label className={addIncomeStyles.formLabel}>Tipo de Recorrência</label>
                    <select
                      name="recurrence_type"
                      value={formData.recurrence_type || 'monthly'}
                      onChange={handleChange}
                      className={addIncomeStyles.formInput}
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

            {/* Botões de Ação */}
            <div className={addIncomeStyles.modalActions}>
              <button 
                type="button" 
                className={`${addIncomeStyles.formButton} ${addIncomeStyles.formCancel}`}
                onClick={() => navigate('/income')}
              >
                <BsXLg /> Cancelar
              </button>
              <button 
                type="submit" 
                className={`${addIncomeStyles.formButton} ${addIncomeStyles.formSubmit}`}
                disabled={loading}
              >
                <BsCheck2 /> {loading ? 'Salvando...' : 'Salvar Receita'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default MobileAddIncome;
