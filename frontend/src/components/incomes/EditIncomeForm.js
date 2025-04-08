import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import dataTableStyles from '../../styles/dataTable.module.css';
import sharedStyles from '../../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';
import { 
  BsPlusCircle, 
  BsCurrencyDollar, 
  BsPencil, 
  BsCheck2, 
  BsRepeat, 
  BsCalendar3, 
  BsXLg,
  BsListCheck
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
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    try {
      console.log('Confirmando alterações com dados:', formData);
      
      // Garante que todos os IDs sejam numéricos
      let category_id = formData.category_id;
      let bank_id = formData.bank_id;
      
      if (category_id && typeof category_id === 'string') {
        category_id = Number(category_id);
      }
      
      if (bank_id && typeof bank_id === 'string') {
        bank_id = Number(bank_id);
      }

      // Define as datas para receitas fixos
      let start_date = formData.start_date;
      let end_date = formData.end_date;
      
      if (formData.is_recurring) {
        if (!end_date) {
          const endDateObj = new Date();
          endDateObj.setMonth(11); // Define o mês como dezembro
          endDateObj.setDate(31); // Define o dia como 31
          endDateObj.setFullYear(2099);
          end_date = endDateObj.toISOString().split('T')[0];
        }
      }

      // Certifique-se de que o valor seja um número
      let amount = formData.amount;
      if (typeof amount === 'string') {
        amount = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
      }

      const updatedIncome = {
        ...formData,
        id: income.id, // Garante que o ID é enviado
        category_id,
        bank_id,
        amount,
        start_date,
        end_date
      };

      console.log('Enviando dados atualizados:', updatedIncome);
      
      onSave(updatedIncome);
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
          <h3>Editar Ganho</h3>
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
                name="date"
                value={formData.date ? formData.date.substring(0, 10) : ''}
                onChange={handleChange}
                className={dataTableStyles.formInput}
                required
              />
            </div>
          </div>

          <div className={dataTableStyles.formGroup}>
            <label className={dataTableStyles.formLabel}>
              Categoria
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
              Banco
            </label>
            <select
              name="bank_id"
              value={formData.bank_id || ''}
              onChange={handleChange}
              className={dataTableStyles.formInput}
            >
              <option value="">Selecione um banco</option>
              {banks.map(bank => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          {income.is_recurring && (
            <div className={dataTableStyles.formGroup}>
              <label className={dataTableStyles.formLabel}>
                <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                  <BsRepeat /> Ganho Fixo
                </div>
              </label>
              <div className={dataTableStyles.formGroupRow}>
                <div className={dataTableStyles.formGroupHalf}>
                  <label className={dataTableStyles.formLabel}>Data de Início</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date ? formData.start_date.substring(0, 10) : ''}
                    onChange={handleChange}
                    className={dataTableStyles.formInput}
                    required
                  />
                </div>
                
                <div className={dataTableStyles.formGroupHalf}>
                  <label className={dataTableStyles.formLabel}>Tipo de Recorrência</label>
                  <select
                    name="recurrence_type"
                    value={formData.recurrence_type}
                    onChange={handleChange}
                    className={dataTableStyles.formInput}
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

          <div className={dataTableStyles.modalActions}>
            <button 
              type="button" 
              onClick={onCancel} 
              className={dataTableStyles.secondaryButton}
            >
              <BsXLg /> Cancelar
            </button>
            <button 
              type="button" 
              onClick={handleUpdateWithConfirmation}
              className={dataTableStyles.primaryButton}
            >
              <BsCheck2 /> Salvar Alterações
            </button>
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <div className={dataTableStyles.modalOverlay}>
          <div className={`${dataTableStyles.modalContent} ${dataTableStyles.confirmModal}`}>
            <div className={dataTableStyles.modalHeader}>
              <BsCheck2 size={24} />
              <h3>Confirmar Alteração</h3>
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className={dataTableStyles.closeButton}
              >
                <BsXLg size={20} />
              </button>
            </div>
            <div className={dataTableStyles.modalBody}>
              <div className={dataTableStyles.confirmMessage}>
                <p>Tem certeza que deseja salvar as alterações nesta receita?</p>
              </div>

              {income.is_recurring && (
                <div className={dataTableStyles.optionsContainer}>
                  <div className={dataTableStyles.optionHeader}>
                    <div className={`${dataTableStyles.typeStatus} ${dataTableStyles.fixedType}`}>
                      <BsRepeat size={14} /> Receita fixa mensal
                    </div>
                  </div>
                  <div className={dataTableStyles.warningText} style={{padding: '10px'}}>
                    As alterações serão aplicadas a todas as ocorrências futuras.
                  </div>
                </div>
              )}

              <div className={dataTableStyles.modalDetails}>
                <div className={dataTableStyles.detailRow}>
                  <span className={dataTableStyles.detailLabel}>Descrição:</span> 
                  <span className={dataTableStyles.detailValue}>{formData.description}</span>
                </div>
                <div className={dataTableStyles.detailRow}>
                  <span className={dataTableStyles.detailLabel}>Valor:</span> 
                  <span className={dataTableStyles.detailValue}>R$ {typeof formData.amount === 'number' 
                    ? formData.amount.toFixed(2) 
                    : parseFloat(formData.amount).toFixed(2)}</span>
                </div>
                <div className={dataTableStyles.detailRow}>
                  <span className={dataTableStyles.detailLabel}>Data:</span>
                  <span className={dataTableStyles.detailValue}>{new Date(formData.date).toLocaleDateString('pt-BR')}</span>
                </div>
                {categories.find(c => c.id === (typeof formData.category_id === 'string' ? parseInt(formData.category_id) : formData.category_id)) && (
                  <div className={dataTableStyles.detailRow}>
                    <span className={dataTableStyles.detailLabel}>Categoria:</span>
                    <span className={dataTableStyles.detailValue}>
                      {categories.find(c => c.id === (typeof formData.category_id === 'string' ? parseInt(formData.category_id) : formData.category_id))?.category_name}
                    </span>
                  </div>
                )}
                {banks.find(b => b.id === (typeof formData.bank_id === 'string' ? parseInt(formData.bank_id) : formData.bank_id)) && (
                  <div className={dataTableStyles.detailRow}>
                    <span className={dataTableStyles.detailLabel}>Banco:</span>
                    <span className={dataTableStyles.detailValue}>
                      {banks.find(b => b.id === (typeof formData.bank_id === 'string' ? parseInt(formData.bank_id) : formData.bank_id))?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className={dataTableStyles.modalActions}>
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className={dataTableStyles.secondaryButton}
              >
                <BsXLg size={16} /> Cancelar
              </button>
              <button 
                onClick={handleConfirmSubmit} 
                className={dataTableStyles.primaryButton}
              >
                <BsCheck2 size={16} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditIncomeForm; 