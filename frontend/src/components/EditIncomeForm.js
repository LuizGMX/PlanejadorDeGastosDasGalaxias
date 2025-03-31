import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from '../styles/addIncome.module.css';
import sharedStyles from '../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';
import { BsPlusCircle } from 'react-icons/bs';

const EditIncomeForm = ({ income, onSave, onCancel }) => {
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: income.description,
    amount: income.amount,
    date: income.date,
    category_id: income.category_id,
    subcategory_id: income.subcategory_id,
    bank_id: income.bank_id,
    is_recurring: income.is_recurring,
    start_date: income.start_date || income.date,
    end_date: income.end_date,
    recurrence_type: income.recurrence_type || 'monthly'
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/categories`, {
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

    const fetchSubcategories = async () => {
      if (formData.category_id) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/incomes/categories/${formData.category_id}/subcategories`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          });

          if (!response.ok) {
            throw new Error('Falha ao carregar subcategorias');
          }

          const data = await response.json();
          setSubcategories(data);
        } catch (err) {
          setError('Erro ao carregar subcategorias. Por favor, tente novamente.');
        }
      } else {
        setSubcategories([]);
      }
    };

    const fetchBanks = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/banks/favorites`, {
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
    fetchSubcategories();
    fetchBanks();
  }, [auth.token, formData.category_id]);

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
      // Define as datas para ganhos fixos
      let start_date = formData.start_date;
      let end_date = null;
      
      if (income.is_recurring) {
        const endDateObj = new Date(start_date);
        endDateObj.setMonth(11); // Define o mês como dezembro
        endDateObj.setDate(31); // Define o dia como 31
        endDateObj.setYear(2099);
        end_date = endDateObj.toISOString().split('T')[0];
      }

      onSave({
        ...income,
        ...formData,
        start_date,
        end_date
      });
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Erro na atualização:', err);
      setError('Erro ao atualizar receita. Por favor, tente novamente.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <h1 className={styles.title}>Editar Ganho</h1>
        {error && <p className={styles.error}>{error}</p>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className="material-icons">description</span>
              Descrição
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className="material-icons">attach_money</span>
              Valor
            </label>
            <CurrencyInput
              name="amount"
              value={formData.amount}
              onValueChange={(value) => setFormData(prev => ({ ...prev, amount: value || 0 }))}
              prefix="R$ "
              decimalsLimit={2}
              decimalSeparator=","
              groupSeparator="."
              className={styles.input}
              required
            />
          </div>

          <div className={styles.paymentOptions}>
            {income.is_recurring ? (
              <div className={`${styles.paymentOption} ${styles.active}`}>
                <div className={styles.optionHeader}>
                  <div className={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      id="is_recurring"
                      name="is_recurring"
                      checked={true}
                      disabled
                      className={styles.checkbox}
                    />
                    <span className={styles.checkboxCheckmark}></span>
                  </div>
                  <label htmlFor="is_recurring" className={styles.optionLabel}>
                    <span className="material-icons">sync</span>
                    Receita Fixa
                  </label>
                </div>

                <div className={styles.optionContent}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>
                      <span className="material-icons">event_repeat</span>
                      Data de Início
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date ? formData.start_date.substring(0, 10) : ''}
                      onChange={handleChange}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>
                      <span className="material-icons">repeat</span>
                      Tipo de Recorrência
                    </label>
                    <select
                      name="recurrence_type"
                      value={formData.recurrence_type}
                      onChange={handleChange}
                      className={styles.input}
                      required
                    >
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!formData.is_recurring && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <span className="material-icons">event</span>
                Data
              </label>
              <input
                type="date"
                name="date"
                value={formData.date ? formData.date.substring(0, 10) : ''}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className="material-icons">category</span>
              Categoria
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className={styles.input}
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

          {formData.category_id && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <span className="material-icons">sell</span>
                Subcategoria
              </label>
              <select
                name="subcategory_id"
                value={formData.subcategory_id || ''}
                onChange={handleChange}
                className={styles.input}
              >
                <option value="">Selecione uma subcategoria</option>
                {subcategories.map(subcategory => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.subcategory_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className="material-icons">account_balance</span>
              Banco/Carteira
            </label>
            <select
              name="bank_id"
              value={formData.bank_id}
              onChange={handleChange}
              className={styles.input}
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

          <div className={styles.buttonGroup}>
            <button type="button" style={{backgroundColor: '#1A1B23', color: '#00FF85'}} onClick={onCancel} className={`${styles.submitButton} ${styles.secondary}`}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton}>
              Salvar
            </button>
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <div className={sharedStyles.modalOverlay}>
          <div className={`${sharedStyles.modalContent} ${styles.fadeIn}`}>
            <div className={styles.modalHeader}>
              <span className="material-icons">warning</span>
              <h3>Confirmar Edição</h3>
            </div>
            
            <div className={styles.modalBody}>
              <p>Você está editando os seguintes dados:</p>
              
              <ul className={styles.changesList}>
                <li>
                  <span className="material-icons">description</span>
                  <span>Descrição: <strong>{formData.description}</strong></span>
                </li>
                <li>
                  <span className="material-icons">attach_money</span>
                  <span>Valor: <strong>R$ {Number(formData.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                </li>
                {!formData.is_recurring && (
                  <li>
                    <span className="material-icons">event</span>
                    <span>Data: <strong>{new Date(formData.date).toLocaleDateString('pt-BR')}</strong></span>
                  </li>
                )}
                {formData.is_recurring && (
                  <>
                    <li>
                      <span className="material-icons">event_repeat</span>
                      <span>Data de Início: <strong>{new Date(formData.start_date).toLocaleDateString('pt-BR')}</strong></span>
                    </li>
                  </>
                )}
                <li>
                  <span className="material-icons">category</span>
                  <span>Categoria: <strong>{categories.find(c => c.id === Number(formData.category_id))?.category_name}</strong></span>
                </li>
                {formData.subcategory_id && (
                  <li>
                    <span className="material-icons">sell</span>
                    <span>Subcategoria: <strong>{subcategories.find(s => s.id === Number(formData.subcategory_id))?.subcategory_name}</strong></span>
                  </li>
                )}
                <li>
                  <span className="material-icons">account_balance</span>
                  <span>Banco/Carteira: <strong>{banks.find(b => b.id === Number(formData.bank_id))?.name}</strong></span>
                </li>
              </ul>

              {formData.is_recurring && (
                <div className={styles.warningBox}>
                  <span className="material-icons">info</span>
                  <p>Esta é uma receita fixa. As alterações serão aplicadas a todas as receitas futuras deste grupo.</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className={sharedStyles.cancelButton}
                style={{
                  backgroundColor: '#1A1B23',
                  color: '#00FF85',
                  border: '1px solid #00FF85'
                }}
              >
                <span className="material-icons">close</span>
                Cancelar
              </button>
              <button
                onClick={handleConfirmSubmit}
                className={sharedStyles.confirmButton}
                style={{
                  backgroundColor: '#00FF85',
                  color: '#1A1B23',
                  border: 'none'
                }}
              >
                <span className="material-icons">check</span>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditIncomeForm; 