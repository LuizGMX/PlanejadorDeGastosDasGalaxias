import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from '../styles/editExpense.module.css';
import sharedStyles from '../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';

const EditExpenseForm = ({ expense, onSave, onCancel }) => {
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    description: expense.description,
    amount: expense.amount,
    expense_date: expense.expense_date,
    category_id: expense.category_id,
    subcategory_id: expense.subcategory_id,
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
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, banksResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/expenses/categories`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }),
          fetch(`${process.env.REACT_APP_API_URL}/api/banks/favorites`, {
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

  useEffect(() => {
    if (formData.category_id) {
      fetchSubcategories();
    }
  }, [formData.category_id]);

  const fetchSubcategories = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/subcategories/${formData.category_id}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar subcategorias');
      }

      const data = await response.json();
      setSubcategories(data);
    } catch (err) {
      setError('Erro ao carregar subcategorias. Por favor, tente novamente.');
    }
  };

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

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.fadeIn}`}>
        <h1 className={styles.title}>Editar Despesa</h1>
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

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className="material-icons">event</span>
              Data
            </label>
            <input
              type="date"
              name="expense_date"
              value={formData.expense_date ? formData.expense_date.split('T')[0] : ''}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

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

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <span className="material-icons">payment</span>
              Método de Pagamento
            </label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className={styles.input}
              required
            >
              <option value="">Selecione um método</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="debit_card">Cartão de Débito</option>
              <option value="money">Dinheiro</option>
              <option value="pix">PIX</option>
            </select>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              <span className="material-icons">close</span>
              Cancelar
            </button>
            <button type="submit" className={styles.confirmButton}>
              <span className="material-icons">check</span>
              Confirmar
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
                {!formData.is_recurring && !formData.has_installments && (
                  <li>
                    <span className="material-icons">event</span>
                    <span>Data: <strong>{new Date(formData.expense_date).toLocaleDateString('pt-BR')}</strong></span>
                  </li>
                )}
                {formData.is_recurring && (
                  <>
                    <li>
                      <span className="material-icons">event_repeat</span>
                      <span>Data de Início: <strong>{new Date(formData.start_date).toLocaleDateString('pt-BR')}</strong></span>
                    </li>
                    <li>
                      <span className="material-icons">event_busy</span>
                      <span>Data de Fim: <strong>{new Date(formData.end_date).toLocaleDateString('pt-BR')}</strong></span>
                    </li>
                  </>
                )}
                {formData.has_installments && (
                  <li>
                    <span className="material-icons">format_list_numbered</span>
                    <span>Número de Parcelas: <strong>{formData.total_installments}</strong></span>
                  </li>
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
                <li>
                  <span className="material-icons">payment</span>
                  <span>Método de Pagamento: <strong>{
                    {
                      'credit_card': 'Cartão de Crédito',
                      'debit_card': 'Cartão de Débito',
                      'pix': 'PIX',
                      'money': 'Dinheiro'
                    }[formData.payment_method]
                  }</strong></span>
                </li>
              </ul>

              {formData.is_recurring && (
                <div className={styles.warningBox}>
                  <span className="material-icons">info</span>
                  <p>Esta é uma despesa fixa. As alterações serão aplicadas a todas as despesas futuras deste grupo.</p>
                </div>
              )}
              
              {formData.has_installments && (
                <div className={styles.warningBox}>
                  <span className="material-icons">info</span>
                  <p>Esta é uma despesa parcelada. As alterações serão aplicadas a todas as parcelas futuras.</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className={styles.cancelButton}
              >
                <span className="material-icons">close</span>
                Cancelar
              </button>
              <button
                onClick={handleConfirmSubmit}
                className={styles.confirmButton}
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

export default EditExpenseForm; 