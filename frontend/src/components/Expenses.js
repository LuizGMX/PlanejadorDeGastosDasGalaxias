import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PixIcon from '@mui/icons-material/Pix';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Layout from './Layout';
import styles from './Expenses.module.css';

function Expenses() {
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const fetchExpenses = async () => {
      const res = await axios.get('/api/expenses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setExpenses(res.data);
    };
    fetchExpenses();
  }, []);

  const deleteExpense = async (id) => {
    await axios.delete(`/api/expenses/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <h2>Despesas</h2>
          <Link to="/add-expense" className={styles.addButton}>
            <AddIcon />
            <span>Adicionar Despesa</span>
          </Link>
        </div>

        {expenses.length === 0 ? (
          <p className={styles.noExpenses}>
            Nenhuma despesa encontrada. Clique em "Adicionar Despesa" para começar!
          </p>
        ) : (
          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                  <th>Cartão</th>
                  <th>Categoria</th>
                  <th>Parcela</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.description}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                    <td className={styles.paymentType}>
                      {expense.payment_method === 'pix' ? (
                        <div className={styles.paymentIcon}>
                          <PixIcon className={styles.pixIcon} />
                        </div>
                      ) : (
                        <div className={styles.paymentIcon}>
                          <CreditCardIcon className={styles.cardIcon} />
                        </div>
                      )}
                    </td>
                    <td className={styles.cardInfo}>
                      {expense.CreditCard ? (
                        <>
                          <span className={`${styles.bankIcon} bb-${expense.CreditCard.bank_name}`}></span>
                          <span>{expense.CreditCard.card_name}</span>
                        </>
                      ) : '-'}
                    </td>
                    <td>{expense.Category.category_name}</td>
                    <td>{expense.installment_number}/{expense.total_installments}</td>
                    <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
                    <td>
                      <button 
                        onClick={() => deleteExpense(expense.id)}
                        className={styles.deleteButton}
                        title="Excluir despesa"
                      >
                        <DeleteIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Expenses;
