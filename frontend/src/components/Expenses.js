import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
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

  return (
    <div className={styles.container}>
      <h2>Despesas</h2>
      <Link to="/add-expense" className={styles.addButton}>Adicionar Despesa</Link>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Valor</th>
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
              <td>R$ {expense.amount}</td>
              <td>{expense.CreditCard?.card_name || 'N/A'}</td>
              <td>{expense.Category.category_name}</td>
              <td>{expense.installment_number}/{expense.total_installments}</td>
              <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
              <td>
                <button onClick={() => deleteExpense(expense.id)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Expenses;
