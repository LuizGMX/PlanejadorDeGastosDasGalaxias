import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import addIncomeStyles from '../../styles/mobile/addIncomeAndExpense.mobile.module.css';
import CurrencyInput from 'react-currency-input-field';
import {  
  BsPencil,
  BsCurrencyDollar, 
  BsCalendar3, 
  BsCheck2, 
  BsXLg,
  BsFolderSymlink,
  BsBank2,
  BsRepeat,
  BsExclamationTriangle
} from 'react-icons/bs';
import { format } from 'date-fns';

const MobileEditIncome = ({ income, onSave, onCancel }) => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: income.description,
    amount: income.amount,
    date: income.date ? income.date.substring(0, 10) : format(new Date(), 'yyyy-MM-dd'),
    category_id: income.category_id,
    bank_id: income.bank_id,
    is_recurring: income.is_recurring,
    start_date: income.start_date || income.date,
    end_date: income.end_date,
    recurrence_type: income.recurrence_type || 'monthly'
  });
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

    const fetchBanks = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks/favorites`, {
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

    fetchCategories();
    fetchBanks();
  }, [auth.token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }

    if (name === 'date' || name === 'start_date' || name === 'end_date') {
      // Formata a data para o formato correto
      const formattedDate = value ? value.split('T')[0] : '';
      setFormData(prev => ({
        ...prev,
        [name]: formattedDate
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (formData.is_recurring) {
      if (!formData.end_date) {
        const endDateObj = new Date();
        endDateObj.setMonth(11); // Define o mês como dezembro
        endDateObj.setDate(31); // Define o dia como 31
        endDateObj.setFullYear(2099);
        formData.end_date = endDateObj.toISOString().split('T')[0];
      }
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    try {
      setLoading(true);
      
      // Garante que todos os IDs sejam numéricos
      let category_id = formData.category_id;
      let bank_id = formData.bank_id;
      
      if (category_id && typeof category_id === 'string') {
        category_id = Number(category_id);
      }
      
      if (bank_id && typeof bank_id === 'string') {
        bank_id = Number(bank_id);
      }

      // Certifique-se de que o valor seja um número
      let amount = formData.amount;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
      }

      const updatedIncome = {
        ...income,
        ...formData,
        category_id,
        bank_id,
        amount
      };

      onSave(updatedIncome);
      setShowConfirmModal(false);
      setSuccess('Receita atualizada com sucesso!');
      
      // Navegar de volta após salvar com sucesso
      setTimeout(() => {
        if (onCancel) onCancel();
      }, 1500);
    } catch (err) {
      console.error('Erro na atualização:', err);
      setError('Erro ao atualizar receita. Por favor, tente novamente.');
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className={addIncomeStyles.modalOverlay}>
      <div className={`${addIncomeStyles.modalContent} ${addIncomeStyles.formModal}`}>
        <div className={addIncomeStyles.modalHeader}>
          <BsPencil size={20} />
          <h2>Editar Receita</h2>
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
          {/* Tipo de Receita - desabilitado para edição */}
          <div className={addIncomeStyles.formGroup}>
            <label className={addIncomeStyles.formLabel}>
              Tipo de Receita
            </label>
            <div className={addIncomeStyles.toggleGroup}>
              <button
                type="button"
                className={`${addIncomeStyles.toggleButton} ${!formData.is_recurring ? addIncomeStyles.active : ''} ${addIncomeStyles.disabled}`}
                disabled={true}
                title="O tipo de receita não pode ser alterado"
              >
                <BsCurrencyDollar style={{color: !formData.is_recurring ? 'var(--secondary-color)' : 'white'}} /> 
                <span style={{color: !formData.is_recurring ? 'var(--secondary-color)' : 'white'}}>Único</span>
              </button>
              <button
                type="button"
                className={`${addIncomeStyles.toggleButton} ${formData.is_recurring ? addIncomeStyles.active : ''} ${addIncomeStyles.disabled}`}
                disabled={true}
                title="O tipo de receita não pode ser alterado"
              >
                <BsRepeat style={{color: formData.is_recurring ? 'var(--secondary-color)' : 'white'}} /> 
                <span style={{color: formData.is_recurring ? 'var(--secondary-color)' : 'white'}}>Fixo</span>
              </button>
            </div>
            <p style={{fontSize: '12px', color: 'var(--warning-color)', marginTop: '4px'}}>
              <BsExclamationTriangle style={{marginRight: '5px'}} /> O tipo de receita não pode ser alterado após a criação.
            </p>
          </div>

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
                  <BsRepeat /> Receita fixa
                </div>
              </label>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '10px'}}>
                <div className={addIncomeStyles.formGroup}>
                  <label className={addIncomeStyles.formLabel}>Data de Início</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date ? formData.start_date.substring(0, 10) : ''}
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
                    <option value="monthly">Mensal</option>
                    <option value="weekly">Semanal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Categoria e Banco em duas colunas */}
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
                  value={formData.bank_id || ''}
                  onChange={handleChange}
                  className={addIncomeStyles.formInput}
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
                  <p>Nenhum banco encontrado. Adicione um banco primeiro.</p>
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className={addIncomeStyles.modalActions}>
            <button 
              type="button" 
              onClick={onCancel} 
              className={addIncomeStyles.formCancel}
            >
              <BsXLg /> Cancelar
            </button>
            <button 
              type="submit" 
              className={addIncomeStyles.formSubmit}
              disabled={loading}
            >
              {loading ? "Salvando..." : <><BsCheck2 /> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className={addIncomeStyles.modalOverlay}>
          <div className={addIncomeStyles.modalContent}>
            <div className={addIncomeStyles.modalHeader}>
              <BsCheck2 size={20} />
              <h3>Confirmar Alteração</h3>
            </div>
            <div style={{padding: '20px'}}>
              <p style={{marginBottom: '15px'}}>
                Tem certeza que deseja salvar as alterações nesta receita?
              </p>

              {income.is_recurring && (
                <div style={{
                  backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  marginBottom: '15px',
                  borderLeft: '4px solid var(--warning-color)'
                }}>
                  <p>Esta é uma receita fixa. As alterações serão aplicadas a todas as ocorrências futuras.</p>
                </div>
              )}

              <div style={{marginBottom: '20px'}}>
                <p><strong>Descrição:</strong> {formData.description}</p>
                <p><strong>Valor:</strong> {formatCurrency(formData.amount)}</p>
                <p><strong>Data:</strong> {new Date(formData.date || formData.start_date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className={addIncomeStyles.modalActions}>
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className={addIncomeStyles.formCancel}
              >
                <BsXLg /> Cancelar
              </button>
              <button 
                onClick={handleConfirmSubmit} 
                className={addIncomeStyles.formSubmit}
              >
                <BsCheck2 /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileEditIncome; 