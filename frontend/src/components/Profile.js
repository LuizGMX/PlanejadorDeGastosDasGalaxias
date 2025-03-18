import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';

const Profile = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: auth.user?.name || '',
    email: auth.user?.email || '',
    net_income: auth.user?.net_income || '',
    financial_goal_name: auth.user?.financial_goal_name || '',
    financial_goal_amount: auth.user?.financial_goal_amount || '',
    financial_goal_date: auth.user?.financial_goal_date ? new Date(auth.user.financial_goal_date).toISOString().split('T')[0] : ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao atualizar perfil');
      }

      setAuth(prev => ({
        ...prev,
        user: data
      }));

      setMessage('Perfil atualizado com sucesso!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className={styles.profileContainer}>
      <h1 className={styles.title}>Meu Perfil</h1>
      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="name">Nome</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="net_income">Renda Líquida</label>
          <CurrencyInput
            id="net_income"
            name="net_income"
            value={formData.net_income}
            onValueChange={(value) => setFormData(prev => ({ ...prev, net_income: value || '' }))}
            prefix="R$ "
            decimalSeparator=","
            groupSeparator="."
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="financial_goal_name">Nome do Objetivo Financeiro</label>
          <input
            type="text"
            id="financial_goal_name"
            name="financial_goal_name"
            value={formData.financial_goal_name}
            onChange={handleChange}
            className={styles.input}
            placeholder="Ex: Comprar um carro"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="financial_goal_amount">Valor do Objetivo</label>
          <CurrencyInput
            id="financial_goal_amount"
            name="financial_goal_amount"
            value={formData.financial_goal_amount}
            onValueChange={(value) => setFormData(prev => ({ ...prev, financial_goal_amount: value || '' }))}
            prefix="R$ "
            decimalSeparator=","
            groupSeparator="."
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="financial_goal_date">Data do Objetivo</label>
          <input
            type="date"
            id="financial_goal_date"
            name="financial_goal_date"
            value={formData.financial_goal_date}
            onChange={handleChange}
            className={styles.input}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <button type="submit" className={styles.submitButton}>
          Salvar Alterações
        </button>
      </form>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className={`${styles.button} ${styles.secondary}`}
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className={`${styles.button} ${styles.danger}`}
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default Profile;
