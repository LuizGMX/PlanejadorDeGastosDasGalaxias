import React, { useState } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import styles from '../styles/dashboard.module.css';

const DateRangePicker = ({ onDateRangeSelect }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (startDate && endDate) {
      onDateRangeSelect({
        start: startDate,
        end: endDate
      });
    }
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
        <button type="submit" className={styles.applyDateRange}>
          Aplicar
        </button>
      </form>
    </div>
  );
};

export default DateRangePicker; 