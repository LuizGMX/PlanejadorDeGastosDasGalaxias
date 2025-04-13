import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import addExpenseStyles from '../../styles/mobile/addIncomeAndExpense.mobile.module.css';
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
  BsCreditCard2Front,
  BsCashCoin,
  BsWallet2,
  BsExclamationTriangle,
  BsListCheck
} from 'react-icons/bs';
import { format } from 'date-fns';

const MobileEditExpense = ({ expense, onSave, onCancel }) => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: expense.description,
    amount: expense.amount,
    expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
    category_id: expense.category_id,
    bank_id: expense.bank_id,
    payment_method: expense.payment_method,
    is_recurring: expense.is_recurring,
    has_installments: expense.has_installments,
    start_date: expense.start_date || expense.expense_date,
    end_date: expense.end_date,
    total_installments: expense.total_installments || 2,
    frequency: expense.frequency || 'monthly'
  });
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, banksResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/expenses/categories`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }),
          fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks/favorites`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          })
        ]);

        if (!categoriesResponse.ok || !banksResponse.ok) {
          throw new Error('Erro ao carregar dados');
        }

        const [categoriesData, banksData] = await Promise.all([
          categoriesResponse.json(),
          banksResponse.json()
        ]);

        setCategories(categoriesData);
        setBanks(banksData);
      } catch (err) {
        setError('Erro ao carregar dados. Por favor, tente novamente.');
      }
    };

    fetchData();
  }, [auth.token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'date' && value) {
      const date = new Date(value);
      date.setHours(12);
      setFormData(prev => ({
        ...prev,
        [name]: date.toISOString().split('T')[0]
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePaymentMethodChange = (method) => {
    setFormData(prev => ({
      ...prev,
      payment_method: method
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (formData.is_recurring) {
      const startDate = new Date(formData.expense_date);
      startDate.setHours(12);
      
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 10);
      
      formData.start_date = startDate.toISOString().split('T')[0];
      formData.end_date = endDate.toISOString().split('T')[0];
    } else {
      formData.start_date = null;
      formData.end_date = null;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    try {
      setLoading(true);
      onSave({
        ...expense,
        ...formData
      });
      setShowConfirmModal(false);
      setSuccess('Despesa atualizada com sucesso!');
      
      // Navegar de volta após salvar com sucesso
      setTimeout(() => {
        if (onCancel) onCancel();
      }, 1500);
    } catch (err) {
      console.error('Erro na atualização:', err);
      setError('Erro ao atualizar despesa. Por favor, tente novamente.');
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
    <div className={addExpenseStyles.modalOverlay}>
      <div className={`${addExpenseStyles.modalContent} ${addExpenseStyles.formModal}`}>
        <div className={addExpenseStyles.modalHeader}>
          <BsPencil size={20} />
          <h2>Editar Despesa</h2>
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
          {/* Tipo de Despesa - desabilitado para edição */}
          <div className={addExpenseStyles.formGroup}>
            <label className={addExpenseStyles.formLabel}>
              Tipo de Despesa
            </label>
            <div className={addExpenseStyles.toggleGroup}>
              <button
                type="button"
                className={`${addExpenseStyles.toggleButton} ${!formData.is_recurring && !formData.has_installments ? addExpenseStyles.active : ''} ${addExpenseStyles.disabled}`}
                disabled={true}
                title="O tipo de despesa não pode ser alterado"
              >
                <BsCurrencyDollar /> Único
              </button>
              <button
                type="button"
                className={`${addExpenseStyles.toggleButton} ${formData.has_installments ? addExpenseStyles.active : ''} ${addExpenseStyles.disabled}`}
                disabled={true}
                title="O tipo de despesa não pode ser alterado"
              >
                <BsListCheck /> Parcelado
              </button>
              <button
                type="button"
                className={`${addExpenseStyles.toggleButton} ${formData.is_recurring ? addExpenseStyles.active : ''} ${addExpenseStyles.disabled}`}
                disabled={true}
                title="O tipo de despesa não pode ser alterado"
              >
                <BsRepeat /> Fixo
              </button>
            </div>
            <p style={{fontSize: '12px', color: 'var(--warning-color)', marginTop: '4px'}}>
              <BsExclamationTriangle style={{marginRight: '5px'}} /> O tipo de despesa não pode ser alterado após a criação.
            </p>
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
                name="category_id"
                value={formData.category_id}
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
                  name="bank_id"
                  value={formData.bank_id}
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
                  <p>Nenhum banco encontrado. Adicione um banco primeiro.</p>
                </div>
              )}
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className={addExpenseStyles.formGroup}>
            <label className={addExpenseStyles.formLabel}>
              Forma de Pagamento
            </label>
            <div className={addExpenseStyles.toggleGroup}>
              <button
                type="button"
                className={`${addExpenseStyles.toggleButton} ${formData.payment_method === 'credit_card' ? addExpenseStyles.active : ''}`}
                onClick={() => handlePaymentMethodChange('credit_card')}
              >
                <BsCreditCard2Front /> Crédito
              </button>
              <button
                type="button"
                className={`${addExpenseStyles.toggleButton} ${formData.payment_method === 'debit_card' ? addExpenseStyles.active : ''}`}
                onClick={() => handlePaymentMethodChange('debit_card')}
              >
                <BsCreditCard2Front /> Débito
              </button>
              <button
                type="button"
                className={`${addExpenseStyles.toggleButton} ${formData.payment_method === 'cash' ? addExpenseStyles.active : ''}`}
                onClick={() => handlePaymentMethodChange('cash')}
              >
                <BsCashCoin /> Dinheiro
              </button>
              <button
                type="button"
                className={`${addExpenseStyles.toggleButton} ${formData.payment_method === 'pix' ? addExpenseStyles.active : ''}`}
                onClick={() => handlePaymentMethodChange('pix')}
              >
                <BsWallet2 /> Pix
              </button>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className={addExpenseStyles.modalActions}>
            <button 
              type="button" 
              onClick={onCancel} 
              className={addExpenseStyles.formCancel}
            >
              <BsXLg /> Cancelar
            </button>
            <button 
              type="submit" 
              className={addExpenseStyles.formSubmit}
              disabled={loading}
            >
              {loading ? "Salvando..." : <><BsCheck2 /> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className={addExpenseStyles.modalOverlay}>
          <div className={addExpenseStyles.modalContent}>
            <div className={addExpenseStyles.modalHeader}>
              <BsCheck2 size={20} />
              <h3>Confirmar Alteração</h3>
            </div>
            <div style={{padding: '20px'}}>
              <p style={{marginBottom: '15px'}}>
                Tem certeza que deseja salvar as alterações nesta despesa?
              </p>

              {expense.is_recurring && (
                <div style={{
                  backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  marginBottom: '15px',
                  borderLeft: '4px solid var(--warning-color)'
                }}>
                  <p>Esta é uma despesa fixa. As alterações serão aplicadas a todas as ocorrências futuras.</p>
                </div>
              )}

              <div style={{marginBottom: '20px'}}>
                <p><strong>Descrição:</strong> {formData.description}</p>
                <p><strong>Valor:</strong> {formatCurrency(formData.amount)}</p>
                <p><strong>Data:</strong> {new Date(formData.expense_date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className={addExpenseStyles.modalActions}>
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className={addExpenseStyles.formCancel}
              >
                <BsXLg /> Cancelar
              </button>
              <button 
                onClick={handleConfirmSubmit} 
                className={addExpenseStyles.formSubmit}
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

export default MobileEditExpense; 