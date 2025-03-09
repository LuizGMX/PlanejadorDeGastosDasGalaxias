import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);
  const [step, setStep] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    netIncome: '',
    selectedBanks: []
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [banks, setBanks] = useState([]);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        console.log('Buscando bancos...');
        const response = await fetch('/api/bank');
        if (!response.ok) {
          throw new Error('Falha ao carregar bancos');
        }
        const data = await response.json();
        console.log('Bancos recebidos:', data);
        setBanks(data);
      } catch (err) {
        console.error('Erro ao buscar bancos:', err);
        setError('Erro ao carregar bancos. Por favor, tente novamente.');
      }
    };

    if (step === 'banks') {
      fetchBanks();
    }
  }, [step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankToggle = (bankId) => {
    setFormData(prev => {
      const selectedBanks = prev.selectedBanks.includes(bankId)
        ? prev.selectedBanks.filter(id => id !== bankId)
        : [...prev.selectedBanks, bankId];
      return { ...prev, selectedBanks };
    });
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
        setStep('banks');
      } else if (step === 'banks') {
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
          selectedBanks: formData.selectedBanks
        }
      : {
          email: formData.email,
          name: formData.name
        };

    console.log('Enviando dados:', requestData);

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
    console.log('Código enviado:', data);
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
    setAuth({ token: data.token });
    localStorage.setItem('token', data.token);
    navigate('/dashboard');
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.title}>Faça login</h1>
              <p className={styles.subtitle}>para entrar para o nosso time</p>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="Digite seu email"
                required
              />
            </div>
          </>
        );

      case 'name':
        return (
          <>
            <h1 className={styles.title}>Como podemos te chamar?</h1>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Nome</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Digite seu nome"
                required
              />
            </div>
          </>
        );

      case 'income':
        return (
          <>
            <h1 className={styles.title}>Qual sua renda líquida mensal?</h1>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Renda Líquida</label>
              <input
                type="number"
                name="netIncome"
                value={formData.netIncome}
                onChange={handleChange}
                className={styles.input}
                placeholder="Digite sua renda"
                step="0.01"
                min="0"
                required
              />
            </div>
          </>
        );

      case 'banks':
        return (
          <>
            <h1 className={styles.title}>Selecione seus bancos</h1>
            <div className={styles.bankGrid}>
              {banks.map(bank => (
                <div
                  key={bank.id}
                  className={`${styles.bankCard} ${
                    formData.selectedBanks.includes(bank.id) ? styles.selected : ''
                  }`}
                  onClick={() => handleBankToggle(bank.id)}
                >
                  <span className={styles.bankName}>{bank.name}</span>
                </div>
              ))}
            </div>
          </>
        );

      case 'code':
        return (
          <>
            <h1 className={styles.title}>Digite o código de verificação</h1>
            <p className={styles.subtitle}>
              Enviamos um código para {formData.email}
            </p>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Código</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={styles.input}
                placeholder="Digite o código"
                maxLength={6}
                required
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginContainer}>
        <div className={styles.loginIllustration}>
          {/* Aqui você pode adicionar a ilustração do astronauta */}
        </div>
        <div className={`${styles.card} ${styles.fadeIn}`}>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <form onSubmit={handleSubmit} className={styles.form}>
            {renderStep()}

            <div className={styles.buttonGroup}>
              {step !== 'email' && (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'name') setStep('email');
                    if (step === 'income') setStep('name');
                    if (step === 'banks') setStep('income');
                    if (step === 'code') setStep(isNewUser ? 'banks' : 'email');
                  }}
                  className={`${styles.button} ${styles.secondary}`}
                >
                  Voltar
                </button>
              )}
              <button type="submit" className={styles.button}>
                {step === 'code' ? 'Verificar' : 'Próximo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;