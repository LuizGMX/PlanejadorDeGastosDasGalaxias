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
    has_installments: false,
    total_installments: '',
    current_installment: '',
    start_date: '',
    end_date: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Define as datas para receitas fixos
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
        start_date,
        end_date
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/incomes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao adicionar ganho');
      }

      setSuccess('Ganho adicionado com sucesso!');
      setTimeout(() => {
        navigate('/incomes');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erro ao adicionar ganho. Por favor, tente novamente.');
    } finally {
      setLoading(false);
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
      <div className={`${dataTableStyles.modalContent} ${dataTableStyles.formModal}`} style={{
        maxWidth: '700px',  // Aumentar a largura máxima no desktop
        width: '90%',       // Garantir responsividade
        padding: '25px'     // Mais padding interno
      }}>
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

        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          {/* Descrição e Valor */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
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
                <BsCurrencyDollar size={16} /> Valor
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

          {/* Tipo de Ganho */}
          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              Tipo de Ganho
            </label>
            <div style={{display: 'flex', justifyContent: 'space-between', gap: '15px', marginTop: '10px'}}>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${!formData.is_recurring ? dataTableStyles.active : ''}`}
                onClick={() => handleToggleChange('is_recurring', false)}
                style={{flex: '1', height: '50px'}}
              >
                <BsCurrencyDollar size={16} /> Único
              </button>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${formData.is_recurring ? dataTableStyles.active : ''}`}
                onClick={() => handleToggleChange('is_recurring', true)}
                style={{flex: '1', height: '50px'}}
              >
                <BsRepeat size={16} /> Fixo
              </button>
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
            <div style={{marginBottom: '20px'}}>
              <label className={dataTableStyles.formLabel}>
                <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                  <BsRepeat /> Ganho Fixo
                </div>
              </label>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '10px'}}>
                <div className={dataTableStyles.formGroup}>
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
                style={{height: '48px'}}
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
                  style={{height: '48px'}}
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
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px'}}>
            <button 
              type="button" 
              onClick={() => navigate('/incomes')} 
              className={`${dataTableStyles.formButton} ${dataTableStyles.formCancel}`}
              style={{minWidth: '120px', height: '45px'}}
            >
              <BsXLg style={{marginRight: '5px'}} /> Cancelar
            </button>
            <button 
              type="submit" 
              className={`${dataTableStyles.formButton} ${dataTableStyles.formSubmit}`}
              disabled={loading}
              style={{minWidth: '180px', height: '45px'}}
            >
              <BsCheck2 style={{marginRight: '5px'}} /> {loading ? 'Salvando...' : 'Salvar Ganho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIncome;
