import React, { useState } from 'react';
import styles from '../styles/telegramLinking.module.css';

const TelegramLinking = ({ user = {}, onUpdate }) => {
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...user,
          phone_number: phoneNumber
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao atualizar número do Telegram');
      }

      const data = await response.json();
      setSuccess(data.message);
      if (onUpdate) onUpdate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTelegram = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...user,
          phone_number: null,
          telegram_verified: false
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao remover Telegram');
      }

      const data = await response.json();
      setPhoneNumber('');
      setSuccess(data.message);
      if (onUpdate) onUpdate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.telegramSection}>
      <h2>Configurações do Telegram</h2>
      
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <div className={styles.telegramInfo}>
        <h3>Por que conectar o Telegram?</h3>
        <ul>
          <li>📱 Registre gastos e receitas direto pelo Telegram</li>
          <li>🔔 Receba notificações importantes</li>
          <li>📊 Consulte seu saldo e relatórios</li>
          <li>⚡ Mais praticidade no seu dia a dia</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className={styles.telegramForm}>
        <div className={styles.inputGroup}>
          <label htmlFor="phone_number">Número do Telegram</label>
          <input
            type="tel"
            id="phone_number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+5511999999999"
            className={styles.input}
            disabled={loading}
          />
          <small className={styles.hint}>
            Use o formato internacional: +5511999999999
          </small>
        </div>

        <div className={styles.buttonGroup}>
          <button 
            type="submit" 
            className={styles.saveButton}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>

          {user?.phone_number && (
            <button
              type="button"
              onClick={handleRemoveTelegram}
              className={styles.removeButton}
              disabled={loading}
            >
              Remover Telegram
            </button>
          )}
        </div>
      </form>

      {user?.phone_number && !user?.telegram_verified && (
        <p className={styles.verificationNote}>
          ⚠️ Seu número ainda não está verificado. Por favor, inicie uma conversa com nosso bot no Telegram para verificar seu número.
        </p>
      )}

      {user?.phone_number && user?.telegram_verified && (
        <p className={styles.verifiedNote}>
          ✅ Seu Telegram está conectado e verificado! Você já pode usar todas as funcionalidades.
        </p>
      )}
    </div>
  );
};

export default TelegramLinking; 