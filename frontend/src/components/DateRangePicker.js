import React, { useState, useEffect } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import styles from '../styles/dashboard.module.css';

const DateRangePicker = ({ onDateRangeSelect, onCancel }) => {
  // Inicializa com o primeiro e último dia do mês atual
  const getDefaultDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };
  
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [error, setError] = useState('');

  const validateDates = () => {
    if (!startDate || !endDate) {
      setError('Ambas as datas devem ser preenchidas');
      return false;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setError('A data inicial deve ser anterior à data final');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateDates()) {
      onDateRangeSelect({
        start: startDate,
        end: endDate
      });
    }
  };
  
  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <div className={styles.dateRangePicker}>
      <div className={styles.dateRangeHeader}>
        <FaCalendarAlt className={styles.calendarIcon} />
        <h3>Selecione o Período</h3>
      </div>
      <form onSubmit={handleSubmit} className={styles.dateRangeForm}>
        <div className={styles.dateInputGroup}>
          <label>Data Inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>
        <div className={styles.dateInputGroup}>
          <label>Data Final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>
        {error && <div className={styles.dateRangeError}>{error}</div>}
        <div className={styles.dateRangeButtons}>
          <button type="button" onClick={handleCancel} className={styles.cancelDateRange}>
            Cancelar
          </button>
          <button type="submit" className={styles.applyDateRange}>
            Aplicar
          </button>
        </div>
      </form>
    </div>
  );
};

export default DateRangePicker; 