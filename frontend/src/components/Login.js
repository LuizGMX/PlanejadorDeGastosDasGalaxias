import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import CurrencyInput from 'react-currency-input-field';
import styles from '../styles/login.module.css';
import logo from '../assets/logo.svg';
import { BsEnvelope, BsPerson, BsCurrencyDollar, BsShieldLock } from 'react-icons/bs';

const Login = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [step, setStep] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    netIncome: '',
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (step === 'email') {
        const response = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });

        if (!response.ok) {
          throw new Error('Falha ao verificar email');
        }

        const data = await response.json();
        setIsNewUser(data.isNewUser);
        
        if (data.isNewUser) {
          setStep('name');
        } else {
          setFormData(prev => ({ ...prev, name: data.name }));
          await requestCode();
          setStep('code');
        }
      } else if (step === 'name') {
        setStep('income');
      } else if (step === 'income') {
        await requestCode();
        setStep('code');
      } else if (step === 'code') {
        await verifyCode();
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro. Por favor, tente novamente.');
    }
  };

  const requestCode = async () => {
    const requestData = isNewUser
      ? {
          email: formData.email,
          name: formData.name,
          netIncome: formData.netIncome,
        }
      : {
          email: formData.email,
          name: formData.name
        };

    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha ao enviar código');
    }

    const data = await response.json();
  };

  const verifyCode = async () => {
    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        code
      })
    });

    if (!response.ok) {
      throw new Error('Código inválido');
    }

    const data = await response.json();
    setAuth({ token: data.token, user: null });
    localStorage.setItem('token', data.token);
    navigate('/dashboard');
  };

  const requestAccessCode = async () => {
    try {
      const response = await fetch('/api/auth/send-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao enviar código de acesso');
      }

      setSuccess('Código de acesso enviado por email');
      
      // Iniciar contagem regressiva
      setResendDisabled(true);
      setResendCountdown(60);
      const countdownInterval = setInterval(() => {
        setResendCountdown(prevCountdown => {
          if (prevCountdown <= 1) {
            clearInterval(countdownInterval);
            setResendDisabled(false);
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    } catch (error) {
      setError(error.message);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Bem-vindo!</h1>
              <p className={styles.loginSubtitle}>
                Entre com seu e-mail para começar a planejar seus gastos de forma intergaláctica
              </p>
            </div>
            <div className={styles.inputWrapper}>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.loginInput}
                placeholder="Digite seu e-mail"
                required
              />
              <BsEnvelope className={styles.inputIcon} />
            </div>
          </>
        );

      case 'name':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Como podemos te chamar?</h1>
              <p className={styles.loginSubtitle}>
                Nos diga seu nome para personalizar sua experiência
              </p>
            </div>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.loginInput}
                placeholder="Digite seu nome"
                required
              />
              <BsPerson className={styles.inputIcon} />
            </div>
          </>
        );

      case 'income':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Qual sua renda mensal?</h1>
              <p className={styles.loginSubtitle}>
                Esta informação nos ajudará a personalizar seu planejamento financeiro
              </p>
            </div>
            <div className={styles.inputWrapper}>
              <CurrencyInput
                name="netIncome"
                placeholder="R$ 0,00"
                decimalsLimit={2}
                prefix="R$ "
                decimalSeparator=","
                groupSeparator="."
                value={formData.netIncome}
                onValueChange={(value) => {
                  const numericValue = value ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : '';
                  setFormData(prev => ({ ...prev, netIncome: numericValue }));
                }}
                className={styles.loginInput}
                required
              />
              <BsCurrencyDollar className={styles.inputIcon} />
            </div>
          </>
        );

      case 'code':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Digite o código</h1>
              <p className={styles.loginSubtitle}>
                Enviamos um código de verificação para {formData.email}. Por favor, verifique também sua caixa de spam.
              </p>
            </div>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={styles.loginInput}
                placeholder="Digite o código"
                maxLength={6}
                required
              />
              <BsShieldLock className={styles.inputIcon} />
            </div>
            <button 
              type="button" 
              onClick={requestAccessCode}
              disabled={resendDisabled}
              className={`${styles.resendButton} ${resendDisabled ? styles.disabled : ''}`}
            >
              {resendDisabled ? `Reenviar em ${resendCountdown}s` : 'Reenviar código'}
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginIllustration}>
        <img src={logo} alt="Logo do Planejador de Gastos das Galáxias" className={styles.logo} />
      </div>
      <div className={styles.formContainer}>
        <div className={styles.loginCard}>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            {renderStep()}

            <div className={styles.buttonGroup}>
              <button type="submit" className={styles.loginButton}>
                {step === 'code' ? 'Entrar' : 'Continuar'}
              </button>

              {step !== 'email' && (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'name') setStep('email');
                    if (step === 'income') setStep('name');
                    if (step === 'code') setStep(isNewUser ? 'income' : 'email');
                  }}
                  className={`${styles.backButton}`}
                >
                  Voltar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;