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
    
    // Criando datas com horário fixo de 12:00 para evitar problemas de timezone
    const start = createDateWithFixedTime(startDate);
    const end = createDateWithFixedTime(endDate);
    
    if (start > end) {
      setError('A data inicial deve ser anterior à data final');
      return false;
    }
    
    setError('');
    return true;
  };

  // Função para criar uma data com horário fixo às 12:00
  const createDateWithFixedTime = (dateString) => {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day, 12, 0, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateDates()) {
      // Enviar datas com horário fixo para evitar problemas de timezone
      const startParts = startDate.split('-').map(num => parseInt(num, 10));
      const endParts = endDate.split('-').map(num => parseInt(num, 10));
      
      onDateRangeSelect({
        start: startDate,
        end: endDate,
        // Adicionando informações processadas para evitar problemas no componente pai
        startNormalized: new Date(startParts[0], startParts[1] - 1, startParts[2], 12, 0, 0).toISOString(),
        endNormalized: new Date(endParts[0], endParts[1] - 1, endParts[2], 12, 0, 0).toISOString()
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