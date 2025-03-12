import React, { useState } from 'react';
import styles from '../styles/expenses.module.css';

const EditIncomeForm = ({ income, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    description: income.description,
    amount: income.amount,
    date: new Date(income.date).toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...income,
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2>Editar Receita</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="description">Descrição</label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="amount">Valor</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="date">Data</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.modalButtons}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.confirmButton}
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditIncomeForm; 