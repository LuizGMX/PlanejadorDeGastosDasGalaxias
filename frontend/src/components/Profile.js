import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import { BsDoorOpen } from 'react-icons/bs';

// Importando os novos componentes
import PersonalInfoAndEmail from './profile/PersonalInfoAndEmail';
import FinancialGoal from './profile/FinancialGoal';
import BanksList from './profile/BanksList';
import TelegramVerification from './profile/TelegramVerification';

const Profile = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);

  // Estados do perfil
  const [formData, setFormData] = useState({
    name: auth.user?.name || '',
    email: auth.user?.email || '',
    financialGoalName: auth.user?.financial_goal_name || '',
    financialGoalAmount: auth.user?.financial_goal_amount?.toString() || '',
    financialGoalPeriodType: auth.user?.financial_goal_period_type || 'years',
    financialGoalPeriodValue: auth.user?.financial_goal_period_value || ''
  });

  // Estados da mudança de email
  const [emailChangeData, setEmailChangeData] = useState({
    current_email: auth.user?.email || '',
    new_email: '',
    code: '',
    step: 'input'
  });
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Estados do Telegram
  const [verificationCode, setVerificationCode] = useState('');
  const [telegramError, setTelegramError] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Estados de mensagens
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Atualiza os dados quando o usuário é carregado
  useEffect(() => {
    if (auth.user) {
      setFormData({
        name: auth.user.name || '',
        email: auth.user.email || '',
        financialGoalName: auth.user.financial_goal_name || '',
        financialGoalAmount: auth.user.financial_goal_amount?.toString() || '',
        financialGoalPeriodType: auth.user.financial_goal_period_type || 'years',
        financialGoalPeriodValue: auth.user.financial_goal_period_value || ''
      });
      setEmailChangeData(prev => ({
        ...prev,
        current_email: auth.user.email || ''
      }));
    }
  }, [auth.user]);

  // Limpa mensagens após 3 segundos
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  // Timer para código do Telegram
  useEffect(() => {
    let timer;
    if (remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            setVerificationCode('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [remainingTime]);

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (value, name) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailInputChange = (e) => {
    const { name, value } = e.target;
    setEmailChangeData(prev => ({ ...prev, [name]: value }));
  };

  // Funções de validação
  const validateFinancialGoalFields = () => {
    if (!formData.financialGoalName || !formData.financialGoalAmount || !formData.financialGoalPeriodType || !formData.financialGoalPeriodValue) {
      setError('Por favor, preencha todos os campos do objetivo financeiro.');
      return false;
    }
    return true;
  };

  // Funções de API
  const saveProfile = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ name: formData.name, email: formData.email })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar perfil');
      }
      const data = await response.json();
      setAuth(prev => ({ ...prev, user: data }));
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar perfil' });
    }
  };

  const saveFinancialGoal = async () => {
    try {
      console.log('Enviando dados da meta financeira:', {
        financial_goal_name: formData.financialGoalName,
        financial_goal_amount: formData.financialGoalAmount,
        financial_goal_period_type: formData.financialGoalPeriodType,
        financial_goal_period_value: formData.financialGoalPeriodValue
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          name: formData.name,
          financial_goal_name: formData.financialGoalName,
          financial_goal_amount: formData.financialGoalAmount
            ? parseFloat(formData.financialGoalAmount.toString().replace(/\./g, '').replace(',', '.'))
            : null,
          financial_goal_period_type: formData.financialGoalPeriodType || null,
          financial_goal_period_value: formData.financialGoalPeriodValue
            ? parseInt(formData.financialGoalPeriodValue)
            : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar meta financeira');
      }

      const data = await response.json();
      console.log('Resposta do servidor:', data);
      
      setAuth(prev => ({ ...prev, user: data }));
      setMessage({ type: 'success', text: 'Meta financeira atualizada com sucesso!' });
    } catch (err) {
      console.error('Erro ao atualizar meta financeira:', err);
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar meta financeira' });
    }
  };

  const changeEmail = useCallback(async () => {
    setMessage(null);
    setError(null);
    try {
      if (emailChangeData.step === 'input') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/change-email/request`, {
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
        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error('Erro ao processar resposta do servidor');
        }
        if (!response.ok) throw new Error(data?.message || 'Aguarde alguns minutos.');
        setEmailChangeData(prev => ({ ...prev, step: 'verify' }));
        setMessage({ type: 'success', text: 'Código de verificação enviado!' });
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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/change-email/verify`, {
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
        let data;
        try {
          data = await response.json();
        } catch {
          throw new Error('Erro ao processar resposta do servidor');
        }
        if (!response.ok) throw new Error(data?.message || 'Erro na verificação do código.');
        setAuth(prev => ({ ...prev, user: data.user }));
        setEmailChangeData({
          current_email: data.user.email,
          new_email: '',
          code: '',
          step: 'input'
        });
        setMessage({ type: 'success', text: 'Email atualizado com sucesso!' });
      }
    } catch (err) {
      setError(err.message || 'Erro ao processar sua solicitação.');
    }
  }, [auth.token, emailChangeData, setAuth]);

  const resendCode = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/change-email/request`, {
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
      if (!response.ok) throw new Error(data.message || 'Erro ao reenviar código');
      setMessage({ type: 'success', text: 'Novo código enviado!' });
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
  }, [auth.token, emailChangeData]);

  const requestTelegramCode = useCallback(async () => {
    if (telegramLoading) return;
    if (verificationCode && remainingTime > 0) {
      setTelegramError('Você já tem um código válido!');
      setTimeout(() => setTelegramError(''), 3000);
      return;
    }
    setTelegramError('');
    try {
      setTelegramLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/telegram/init-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      });
      const data = await response.json();
      if ((response.status === 429 && data.code) || (data.success && data.code)) {
        setVerificationCode(data.code);
        setRemainingTime(300);
      } else {
        throw new Error(data.message || 'Erro ao gerar código');
      }
    } catch (err) {
      setTelegramError(err.message || 'Erro ao solicitar código');
      setTimeout(() => setTelegramError(''), 3000);
    } finally {
      setTelegramLoading(false);
    }
  }, [telegramLoading, auth.token, verificationCode, remainingTime]);

  const logout = useCallback(() => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('token');
    navigate('/login');
  }, [navigate, setAuth]);

  const getRemainingTime = useCallback(() => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingTime]);

  // Refresh user data from the server
  const refreshUserData = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setAuth({
          ...auth,
          user: userData
        });
        
        if (userData.telegram_verified) {
          setMessage({
            type: 'success',
            text: 'Telegram verificado com sucesso!'
          });
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      setError('Falha ao verificar status do Telegram. Tente novamente.');
    }
  }, [auth, setAuth]);

  return (
    <div className={styles.mainContainer}>
      <div className={styles.pageHeader}>
        <h1>Meu Perfil</h1>
        <button onClick={logout} className={styles.logoutButton}>
          <BsDoorOpen /> Sair
        </button>
      </div>
      {message && <p className={styles.successMessage}>{message.text}</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}
      <div className={styles.content}>
        <div className={`${styles.cardsGrid} ${styles.twoColumns}`}>
          {/* Coluna Esquerda */}
          <div className={styles.cardColumn}>
            <PersonalInfoAndEmail 
              emailChangeData={emailChangeData}
              handleEmailInputChange={handleEmailInputChange}
              changeEmail={changeEmail}
              resendCode={resendCode}
              resendDisabled={resendDisabled}
              resendCountdown={resendCountdown}
              setEmailChangeData={setEmailChangeData}
            />
            <FinancialGoal 
              formData={formData}
              handleChange={handleChange}
              handleCurrencyChange={handleCurrencyChange}
              saveFinancialGoal={saveFinancialGoal}
              user={auth.user}
            />
          </div>
          {/* Coluna Direita */}
          <div className={styles.cardColumn}>
            {auth.token && auth.user && (
              <BanksList 
                auth={auth}
                setMessage={setMessage}
                setError={setError}
              />
            )}
            <TelegramVerification 
              user={auth.user}
              verificationCode={verificationCode}
              remainingTime={remainingTime}
              telegramError={telegramError}
              telegramLoading={telegramLoading}
              requestTelegramCode={requestTelegramCode}
              getRemainingTime={getRemainingTime}
              refreshUserData={refreshUserData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
