import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import dataTableStyles from '../styles/dataTable.module.css';
import sharedStyles from '../styles/shared.module.css';
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
  BsExclamationTriangle
} from 'react-icons/bs';

const EditExpenseForm = ({ expense, onSave, onCancel }) => {
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: expense.description,
    amount: expense.amount,
    expense_date: expense.expense_date,
    category_id: expense.category_id,
    bank_id: expense.bank_id,
    payment_method: expense.payment_method,
    card_type: expense.payment_method === 'credit_card' || expense.payment_method === 'debit_card' ? expense.payment_method : 'credit_card',
    is_recurring: expense.is_recurring,
    has_installments: expense.has_installments,
    start_date: expense.start_date || expense.expense_date,
    end_date: expense.end_date,
    total_installments: expense.total_installments || 2
  });
  const [categories, setCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, banksResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/expenses/categories`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }),
          fetch(`${process.env.REACT_APP_API_URL}/banks/favorites`, {
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

        console.log('Banks data:', banksData);
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
        [name]: date.toISOString()
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.is_recurring) {
      const startDate = new Date(formData.expense_date);
      startDate.setHours(12);
      
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 10);
      
      formData.start_date = startDate.toISOString();
      formData.end_date = endDate.toISOString();
    } else {
      formData.start_date = null;
      formData.end_date = null;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    try {
      onSave({
        ...expense,
        ...formData
      });
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Erro na atualização:', err);
      setError('Erro ao atualizar despesa. Por favor, tente novamente.');
    }
  };

  const handleUpdateWithConfirmation = () => {
    handleSubmit({ preventDefault: () => {} });
  };

  const handlePaymentMethodChange = (method) => {
    setFormData(prev => ({
      ...prev,
      payment_method: method
    }));
  };

  return (
    <div className={dataTableStyles.modalOverlay}>
      <div className={`${dataTableStyles.modalContent} ${dataTableStyles.formModal}`}>
        <div className={dataTableStyles.modalHeader}>
          <BsPencil size={20} />
          <h3>Editar Despesa</h3>
        </div>
        
        {error && <p className={dataTableStyles.errorMessage}>{error}</p>}
        
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
                value={formData.amount}
                onValueChange={(value) => setFormData(prev => ({ ...prev, amount: value || 0 }))}
                prefix="R$ "
                decimalsLimit={2}
                decimalSeparator=","
                groupSeparator="."
                className={dataTableStyles.formInput}
                required
              />
            </div>
          </div>

          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              Data
            </label>
            <div className={dataTableStyles.inputWithIcon}>
              <BsCalendar3 className={dataTableStyles.inputIcon} />
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date ? formData.expense_date.split('T')[0] : ''}
                onChange={handleChange}
                className={dataTableStyles.formInput}
                required
              />
            </div>
          </div>

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
              onClick={onCancel} 
              className={dataTableStyles.cancelButton}
            >
              <BsXLg /> Cancelar
            </button>
            <button 
              type="button" 
              onClick={handleUpdateWithConfirmation} 
              className={dataTableStyles.confirmButton}
            >
              <BsCheck2 /> Salvar Alterações
            </button>
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={dataTableStyles.modalContent}>
            <div className={dataTableStyles.modalHeader}>
              <BsCheck2 size={20} />
              <h3>Confirmar Alteração</h3>
            </div>
            <div className={dataTableStyles.modalBody}>
              <p className={dataTableStyles.modalMessage}>
                Tem certeza que deseja salvar as alterações nesta despesa?
              </p>

              {expense.is_recurring && (
                <div className={`${dataTableStyles.warningMessage}`}>
                  <p>Esta é uma despesa fixa. As alterações serão aplicadas a todas as ocorrências futuras.</p>
                </div>
              )}

              <div className={dataTableStyles.modalDetails}>
                <p><strong>Descrição:</strong> {formData.description}</p>
                <p><strong>Valor:</strong> R$ {typeof formData.amount === 'number' 
                  ? formData.amount.toFixed(2) 
                  : parseFloat(formData.amount).toFixed(2)}</p>
                <p><strong>Data:</strong> {new Date(formData.expense_date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className={dataTableStyles.modalActions}>
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className={dataTableStyles.cancelButton}
              >
                <BsXLg /> Cancelar
              </button>
              <button 
                onClick={handleConfirmSubmit} 
                className={dataTableStyles.confirmButton}
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

export default EditExpenseForm; 