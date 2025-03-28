import React, { useState } from 'react';
import styles from '../../styles/shared.module.css';

const PersonalInfoAndEmail = ({ 
  formData, 
  handleChange, 
  saveProfile,
  emailChangeData,
  handleEmailInputChange,
  changeEmail,
  resendCode,
  resendDisabled,
  resendCountdown,
  setEmailChangeData
}) => {
  const [successMessage, setSuccessMessage] = useState('');

  const handleChangeEmail = async () => {
    try {
      await changeEmail();
      setSuccessMessage('Email alterado com sucesso!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (error) {
      console.error('Erro ao alterar email:', error);
    }
  };

  return (
    <div className={styles.dashboardCard}>
      <div className={styles.dashboardTitle}>
        <h2>Alterar Email</h2>
      </div>
      <div className={styles.cardBody}>
        {successMessage && (
          <div className={styles.successMessage}>
            {successMessage}
          </div>
        )}
        {emailChangeData.step === 'input' ? (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="current_email">Email Atual</label>
              <input
                type="email"
                id="current_email"
                name="current_email"
                value={emailChangeData.current_email}
                onChange={handleEmailInputChange}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="new_email">Novo Email</label>
              <input
                type="email"
                id="new_email"
                name="new_email"
                value={emailChangeData.new_email}
                onChange={handleEmailInputChange}
                className={styles.input}
                required
              />
            </div>
          </>
        ) : (
          <div className={styles.formGroup}>
            <label htmlFor="code">Código de Verificação</label>
            <input
              type="text"
              id="code"
              name="code"
              value={emailChangeData.code}
              onChange={handleEmailInputChange}
              className={styles.input}
              placeholder="Digite o código recebido"
              required
            />
            {resendDisabled ? (
              <p className={styles.resendInfo}>Reenviar código em {resendCountdown}s</p>
            ) : (
              <button type="button" onClick={resendCode} className={styles.resendButton}>
                Reenviar Código
              </button>
            )}
          </div>
        )}
        <button type="button" onClick={handleChangeEmail} className={styles.submitButton}>
          {emailChangeData.step === 'input' ? 'Solicitar Mudança' : 'Verificar Código'}
        </button>
        {emailChangeData.step === 'verify' && (
          <button
            type="button"
            onClick={() => setEmailChangeData(prev => ({ ...prev, step: 'input' }))}
            className={`${styles.button} ${styles.secondary}`}
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonalInfoAndEmail; 