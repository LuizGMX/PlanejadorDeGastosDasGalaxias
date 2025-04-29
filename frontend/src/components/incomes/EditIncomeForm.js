import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import dataTableStyles from '../../styles/dataTable.module.css';
import sharedStyles from '../../styles/shared.module.css';
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

const EditIncomeForm = ({ income, onSave, onCancel }) => {
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: income.description,
    amount: income.amount,
    date: income.date,
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
          throw new Error('Erro ao carregar categorias');
        }

        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
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
          throw new Error('Erro ao carregar bancos');
        }

        const data = await response.json();
        setBanks(data);
      } catch (error) {
        console.error('Erro ao carregar bancos:', error);
        setError('Erro ao carregar bancos. Por favor, tente novamente.');
      }
    };

    fetchCategories();
    fetchBanks();
  }, [auth.token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.is_recurring) {
      const startDate = new Date(formData.date);
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
        ...income,
        ...formData
      });
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Erro na atualização:', err);
      setError('Erro ao atualizar receita. Por favor, tente novamente.');
    }
  };

  const handleUpdateWithConfirmation = () => {
    handleSubmit({ preventDefault: () => {} });
  };

  return (
    <div className={dataTableStyles.modalOverlay}>
      <div className={`${dataTableStyles.modalContent} ${dataTableStyles.formModal}`}>
        <div className={dataTableStyles.modalHeader}>
          <BsPencil size={20} />
          <h3>Editar Receita</h3>
        </div>
        
        {error && <p className={dataTableStyles.errorMessage}>{error}</p>}
        
        <form onSubmit={handleSubmit} className={dataTableStyles.formGrid}>
          {/* Tipo de Receita */}
          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              Tipo de Receita
            </label>
            <div className={dataTableStyles.toggleGroup}>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${!formData.is_recurring ? dataTableStyles.active : ''} ${dataTableStyles.disabled}`}
                disabled={true}
                title="O tipo de receita não pode ser alterado"
              >
                <BsCurrencyDollar /> Único
              </button>
              <button
                type="button"
                className={`${dataTableStyles.toggleButton} ${formData.is_recurring ? dataTableStyles.active : ''} ${dataTableStyles.disabled}`}
                disabled={true}
                title="O tipo de receita não pode ser alterado"
              >
                <BsRepeat /> Fixo
              </button>
            </div>
            <p className={dataTableStyles.helperText} style={{fontSize: '12px', color: 'var(--warning-color)', marginTop: '4px'}}>
              <BsExclamationTriangle style={{marginRight: '5px'}} /> O tipo de receita não pode ser alterado após a criação.
            </p>
          </div>

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
                name="date"
                value={formData.date ? formData.date.split('T')[0] : ''}
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
                Tem certeza que deseja salvar as alterações nesta receita?
              </p>

              {income.is_recurring && (
                <div className={`${dataTableStyles.warningMessage}`}>
                  <p>Esta é uma receita fixa. As alterações serão aplicadas a todas as ocorrências futuras.</p>
                </div>
              )}

              <div className={dataTableStyles.modalDetails}>
                <p><strong>Descrição:</strong> {formData.description}</p>
                <p><strong>Valor:</strong> R$ {typeof formData.amount === 'number' 
                  ? formData.amount.toFixed(2) 
                  : parseFloat(formData.amount).toFixed(2)}</p>
                <p><strong>Data:</strong> {new Date(formData.date).toLocaleDateString('pt-BR')}</p>
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

export default EditIncomeForm; 