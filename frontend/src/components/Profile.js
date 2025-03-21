import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';
import { BsDoorOpen } from 'react-icons/bs';

const Profile = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    financialGoalName: '',
    financialGoalAmount: '',
    financialGoalDate: ''
  });

  const [emailChangeData, setEmailChangeData] = useState({
    current_email: '',
    new_email: '',
    code: '',
    step: 'input'
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (auth.user) {
      setFormData({
        name: auth.user.name || '',
        email: auth.user.email || '',
        financialGoalName: auth.user.financial_goal_name || '',
        financialGoalAmount: auth.user.financial_goal_amount ? auth.user.financial_goal_amount.toString() : '',
        financialGoalDate: auth.user.financial_goal_date || ''
      });
      setEmailChangeData(prev => ({
        ...prev,
        current_email: auth.user.email || ''
      }));
    }
  }, [auth.user]);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailChangeData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          financial_goal_name: formData.financialGoalName,
          financial_goal_amount: formData.financialGoalAmount,
          financial_goal_date: formData.financialGoalDate
        })
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
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      setTimeout(() => {
        const messageElement = document.querySelector(`.${styles.successMessage}`);
        if (messageElement) {
          messageElement.style.opacity = '1';
        }
      }, 100);
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEmailChangeSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      if (emailChangeData.step === 'input') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/change-email/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            current_email: emailChangeData.current_email,
            new_email: emailChangeData.new_email
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Erro ao solicitar mudança de email');
        }

        setEmailChangeData(prev => ({ ...prev, step: 'verify' }));
        setMessage('Código de verificação enviado para o novo email!');
        
        setResendDisabled(true);
        setResendCountdown(60);
        const countdownInterval = setInterval(() => {
          setResendCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              setResendDisabled(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/change-email/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            new_email: emailChangeData.new_email,
            code: emailChangeData.code
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Erro ao verificar código');
        }

        setAuth(prev => ({
          ...prev,
          user: data.user
        }));

        setEmailChangeData({
          current_email: data.user.email,
          new_email: '',
          code: '',
          step: 'input'
        });

        setMessage('Email atualizado com sucesso!');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResendCode = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/change-email/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          current_email: emailChangeData.current_email,
          new_email: emailChangeData.new_email
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao reenviar código');
      }

      setMessage('Novo código de verificação enviado!');
      
      setResendDisabled(true);
      setResendCountdown(60);
      const countdownInterval = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
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
      
      {message && (
        <div className={styles.successMessage} style={{ opacity: 0, transition: 'opacity 0.3s ease-in' }}>
          {message}
        </div>
      )}
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <div className={styles.formSection}>
        <h2>Informações Pessoais</h2>
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
            <label htmlFor="financialGoalName">Nome do Objetivo Financeiro</label>
            <input
              type="text"
              id="financialGoalName"
              name="financialGoalName"
              value={formData.financialGoalName}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="financialGoalAmount">Valor do Objetivo</label>
            <CurrencyInput
              id="financialGoalAmount"
              name="financialGoalAmount"
              value={formData.financialGoalAmount}
              onValueChange={(value) => setFormData(prev => ({ ...prev, financialGoalAmount: value || '' }))}
              prefix="R$ "
              decimalSeparator=","
              groupSeparator="."
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="financialGoalDate">Data do Objetivo</label>
            <input
              type="date"
              id="financialGoalDate"
              name="financialGoalDate"
              value={formData.financialGoalDate}
              onChange={handleChange}
              className={styles.input}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <button type="submit" className={styles.submitButton}>
            Salvar Alterações
          </button>
        </form>
      </div>

      <div className={styles.formSection}>
        <h2>Alterar Email</h2>
        <form onSubmit={handleEmailChangeSubmit} className={styles.form}>
          {emailChangeData.step === 'input' ? (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="current_email">Email Atual</label>
                <input
                  type="email"
                  id="current_email"
                  name="current_email"
                  value={emailChangeData.current_email}
                  onChange={handleEmailChange}
                  className={styles.input}
                  required
                  disabled
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="new_email">Novo Email</label>
                <input
                  type="email"
                  id="new_email"
                  name="new_email"
                  value={emailChangeData.new_email}
                  onChange={handleEmailChange}
                  className={styles.input}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="code">Código de Verificação</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={emailChangeData.code}
                  onChange={handleEmailChange}
                  className={styles.input}
                  placeholder="Digite o código recebido no novo email"
                  required
                />
              </div>

              {resendDisabled ? (
                <p className={styles.resendInfo}>
                  Reenviar código em {resendCountdown}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className={styles.resendButton}
                >
                  Reenviar Código
                </button>
              )}
            </>
          )}

          <button type="submit" className={styles.submitButton}>
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
        </form>
      </div>

      <div className={styles.buttonGroup}>
        <button className={styles.logoutButton} onClick={handleLogout}>
          <span className={styles.icon}><BsDoorOpen size={20} /></span>
          Sair
        </button>
      </div>

    
    </div>
  );
};

export default Profile;
