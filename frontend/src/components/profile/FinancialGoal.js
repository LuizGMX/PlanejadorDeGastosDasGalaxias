import React from 'react';
import styles from '../../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';

const FinancialGoal = ({ formData, handleChange, handleCurrencyChange, saveFinancialGoal, user }) => {
  const handleSubmit = async () => {
    try {
      // Validações
      if (!formData.financialGoalName) {
        throw new Error('Por favor, preencha o nome da meta');
      }
      if (!formData.financialGoalAmount) {
        throw new Error('Por favor, preencha o valor da meta');
      }
      if (!formData.financialGoalPeriodType) {
        throw new Error('Por favor, selecione o tipo de período');
      }
      if (!formData.financialGoalPeriodValue) {
        throw new Error('Por favor, preencha o valor do período');
      }

      // Converte o valor para número
      const amount = parseFloat(formData.financialGoalAmount.toString().replace(/\./g, '').replace(',', '.'));
      if (isNaN(amount)) {
        throw new Error('Valor da meta inválido');
      }

      // Converte o período para número
      const periodValue = parseInt(formData.financialGoalPeriodValue);
      if (isNaN(periodValue) || periodValue <= 0) {
        throw new Error('Valor do período inválido');
      }

      await saveFinancialGoal();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      alert(error.message);
    }
  };

  return (
    <div className={styles.dashboardCard}>
      <div className={styles.dashboardTitle}>
        <h2>Meta Financeira</h2>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.formGroup}>
          <p className={styles.fieldHelp}>
            Digite um nome para identificar seu objetivo (ex: Comprar um carro)
          </p>
          <label htmlFor="financialGoalName">Nome da Meta</label>
          <input
            type="text"
            id="financialGoalName"
            name="financialGoalName"
            value={formData.financialGoalName}
            onChange={handleChange}
            className={styles.input}
            placeholder="Ex: Comprar um carro"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <p className={styles.fieldHelp}>
            Valor total que você quer economizar
          </p>
          <label htmlFor="financialGoalAmount">Valor da Meta</label>
          <CurrencyInput
            id="financialGoalAmount"
            name="financialGoalAmount"
            value={formData.financialGoalAmount}
            onValueChange={(value) => handleCurrencyChange(value, 'financialGoalAmount')}
            className={styles.input}
            prefix="R$ "
            decimalScale={2}
            fixedDecimalLength={2}
            thousandSeparator="."
            decimalSeparator=","
            placeholder="R$ 0,00"
            required
          />
        </div>
        <div className={styles.periodContainer}>
          <div className={styles.formGroup}>
            <p className={styles.fieldHelp}>
              Digite o número de dias/meses/anos para atingir o objetivo
            </p>
            <label htmlFor="financialGoalPeriodValue">Quantidade</label>
            <div className={styles.inputWithIcon}>
              <input
                type="number"
                id="financialGoalPeriodValue"
                name="financialGoalPeriodValue"
                value={formData.financialGoalPeriodValue}
                onChange={handleChange}
                className={styles.input}
                min="1"
                placeholder="Ex: 2"
                required
              />
              <span className="material-icons">schedule</span>
            </div>
          </div>
          <div className={styles.formGroup}>
            <p className={styles.fieldHelp}>
              Escolha se quer atingir em dias, meses ou anos
            </p>
            <label htmlFor="financialGoalPeriodType">Período</label>
            <div className={styles.inputWithIcon}>
              <select
                id="financialGoalPeriodType"
                name="financialGoalPeriodType"
                value={formData.financialGoalPeriodType || 'years'}
                onChange={handleChange}
                className={styles.input}
                required
              >
                <option value="days">Dias</option>
                <option value="months">Meses</option>
                <option value="years">Anos</option>
              </select>
              <span className="material-icons">schedule</span>
            </div>
          </div>
        </div>
        {user.financial_goal_start_date && user.financial_goal_end_date && (
          <div className={styles.goalDates}>
            <p>
              <strong>Início:</strong> {new Date(user.financial_goal_start_date).toLocaleDateString('pt-BR')}
            </p>
            <p>
              <strong>Término:</strong> {new Date(user.financial_goal_end_date).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}
        <button type="button" onClick={handleSubmit} className={styles.submitButton}>
          Salvar Meta
        </button>
      </div>
    </div>
  );
};

export default FinancialGoal; 