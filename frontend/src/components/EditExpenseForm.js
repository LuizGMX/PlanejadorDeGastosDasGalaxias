import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import styles from '../styles/expenses.module.css';
import CurrencyInput from 'react-currency-input-field';
import { BsCreditCard2Front } from 'react-icons/bs';
import { SiPix } from 'react-icons/si';

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
    is_recurring: expense.is_recurring,
    start_date: expense.start_date || expense.expense_date,
    end_date: expense.end_date
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/categories`, {
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
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/subcategories/${formData.category_id}`, {
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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/banks`, {
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
    
    // Para campos de data, garante que o valor seja uma string ISO
    if (type === 'date' && value) {
      const date = new Date(value);
      date.setHours(12); // Meio-dia para evitar problemas de timezone
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
    try {
      onSave({
        ...expense,
        ...formData
      });
    } catch (err) {
      console.error('Erro na atualização:', err);
      setError('Erro ao atualizar despesa. Por favor, tente novamente.');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Editar Despesa</h2>
        {error && <p className={styles.error}>{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label>Descrição</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Valor</label>
            <CurrencyInput
              name="amount"
              value={formData.amount}
              onValueChange={(value) => setFormData(prev => ({ ...prev, amount: value || 0 }))}
              prefix="R$ "
              decimalsLimit={2}
              decimalSeparator=","
              groupSeparator="."
              required
            />
          </div>

          {formData.is_recurring && (
            <>
              <div className={styles.inputGroup}>
                <label>Data de Início</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date ? formData.start_date.split('T')[0] : ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Data de Fim</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date ? formData.end_date.split('T')[0] : ''}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label>Categoria</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
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
              <label>Subcategoria</label>
              <select
                name="subcategory_id"
                value={formData.subcategory_id || ''}
                onChange={handleChange}
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
            <label>Banco/Carteira</label>
            <select
              name="bank_id"
              value={formData.bank_id}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um banco</option>
              {banks.map(bank => (
                <option key={bank.id} value={bank.id}>
                  {bank.bank_name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>Método de Pagamento</label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              required
            >
              <option value="">Selecione um método</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="debit_card">Cartão de Débito</option>
              <option value="money">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="transfer">Transferência</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div className={styles.modalButtons}>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveButton}>
              Salvar
            </button>
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Atenção!</h3>
            <p>
              Ao mudar para despesa à vista, todas as {expense.is_recurring ? 'recorrências' : 'parcelas'} serão excluídas.
              Deseja continuar?
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingChanges(null);
                }}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setFormData(pendingChanges);
                  setShowConfirmModal(false);
                  setPendingChanges(null);
                }}
                className={styles.confirmButton}
              >
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