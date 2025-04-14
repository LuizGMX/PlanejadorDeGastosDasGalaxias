import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import dataTableStyles from '../../styles/dataTable.module.css';
import sharedStyles from '../../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';
import { 
  BsPlusCircle, 
  BsCurrencyDollar, 
  BsCalendar3, 
  BsCheck2, 
  BsXLg,
  BsFolderSymlink,
  BsBank2,
  BsRepeat
} from 'react-icons/bs';

const AddIncome = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: '',
    category_id: '',
    bank_id: '',
    is_recurring: false,
    start_date: '',
    end_date: '',
    recurrence_type: 'monthly'
  });
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIncomeAdded, setIsIncomeAdded] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes/categories`, {
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
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks/users`, {
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

    if (name === 'date' || name === 'end_date') {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const requestData = {
        description: formData.description,
        amount: formData.amount,
        category_id: formData.category_id || formData.category?.id,
        income_date: formData.date,
        bank_id: formData.bank_id || formData.bank?.id,
        payment_method: formData.payment_method,
        is_recurring: formData.is_recurring,
      };

      // Adicionando informações específicas de recorrência quando é receita recorrente
      if (formData.is_recurring) {
        requestData.recurrence_rule = {
          frequency: formData.recurrence_type || 'monthly',
          start_date: formData.date
        };
      }

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
            (bank) => bank.id === formData.bank.id
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
        setIsIncomeAdded(true);
        setSuccess('Receita adicionada com sucesso!');
        
        if (formData.is_recurring) {
          // Handle recurring income
          // This is a placeholder and should be replaced with the actual implementation
          console.log('Recurring income added');
        } else {
          setTimeout(() => {
            navigate('/incomes');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar receita:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao adicionar receita. Tente novamente.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className={dataTableStyles.modalOverlay}>
      <div className={`${dataTableStyles.modalContent} ${dataTableStyles.formModal}`}>
        <div className={dataTableStyles.modalHeader}>
          <BsPlusCircle size={20} style={{ color: 'var(--primary-color)' }} />
          <h3>Adicionar Ganho</h3>
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
          {/* Tipo de Ganho */}
          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              Tipo de Ganho
            </label>
            <div className={dataTableStyles.toggleGroup}>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${!formData.is_recurring ? dataTableStyles.active : ''}`}
                onClick={() => handleToggleChange('is_recurring', false)}
              >
                <BsCurrencyDollar style={{color: !formData.is_recurring ? 'var(--secondary-color)' : 'white'}} /> 
                <span style={{color: !formData.is_recurring ? 'var(--secondary-color)' : 'white'}}>Único</span>
              </button>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${formData.is_recurring ? dataTableStyles.active : ''}`}
                onClick={() => handleToggleChange('is_recurring', true)}
              >
                <BsRepeat style={{color: formData.is_recurring ? 'var(--secondary-color)' : 'white'}} /> 
                <span style={{color: formData.is_recurring ? 'var(--secondary-color)' : 'white'}}>Fixo</span>
              </button>
            </div>
          </div>

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
                Valor
              </label>
              <CurrencyInput
                name="amount"
                placeholder="R$ 0,00"
                decimalsLimit={2}
                value={formData.amount}
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

          {/* Data para Ganho Único */}
          {!formData.is_recurring && (
            <div className={dataTableStyles.formGroup}>
              <label className={dataTableStyles.formLabel}>
                Data
              </label>
              <div className={dataTableStyles.inputWithIcon}>
                <BsCalendar3 className={dataTableStyles.inputIcon} />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={dataTableStyles.formInput}
                  required
                />
              </div>
            </div>
          )}

          {/* Configurações de Ganho Fixo */}
          {formData.is_recurring && (
            <div className={dataTableStyles.formGroup}>
              <label className={dataTableStyles.formLabel}>
                <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                  <BsRepeat /> Ganho Fixo
                </div>
              </label>
              <div className={dataTableStyles.inlineFieldsContainer}>
                <div className={dataTableStyles.formGroupHalf}>
                  <label className={dataTableStyles.formLabel}>Data de Início</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={dataTableStyles.formInput}
                    required
                  />
                </div>
                
                <div className={dataTableStyles.formGroupHalf}>
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

          {/* Botões de Ação */}
          <div className={dataTableStyles.modalActions}>
            <button 
              type="button" 
              onClick={() => navigate('/incomes')} 
              className={`${dataTableStyles.formButton} ${dataTableStyles.formCancel}`}
            >
              <BsXLg /> Cancelar
            </button>
            <button 
              type="submit" 
              className={`${dataTableStyles.formButton} ${dataTableStyles.formSubmit}`}
              disabled={loading}
            >
              <BsCheck2 /> {loading ? 'Salvando...' : 'Salvar Ganho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIncome;
