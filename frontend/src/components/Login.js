import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import CurrencyInput from 'react-currency-input-field';
import styles from '../styles/login.module.css';
import logo from '../assets/logo.svg';
import { BsEnvelope, BsPerson, BsCurrencyDollar, BsShieldLock } from 'react-icons/bs';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);
  const [step, setStep] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    netIncome: '',
    // selectedBanks: []
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // const [banks, setBanks] = useState([]);
  const [isNewUser, setIsNewUser] = useState(false);

  // useEffect(() => {
  //   const fetchBanks = async () => {
  //     try {
  //       console.log('Buscando bancos...');
  //       const response = await fetch('/api/bank');
  //       if (!response.ok) {
  //         throw new Error('Falha ao carregar bancos');
  //       }
  //       const data = await response.json();
  //       console.log('Bancos recebidos:', data);
  //       setBanks(data);
  //     } catch (err) {
  //       console.error('Erro ao buscar bancos:', err);
  //       setError('Erro ao carregar bancos. Por favor, tente novamente.');
  //     }
  //   };

  //   if (step === 'banks') {
  //     fetchBanks();
  //   }
  // }, [step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // const handleBankToggle = (bankId) => {
  //   setFormData(prev => {
  //     const selectedBanks = prev.selectedBanks.includes(bankId)
  //       ? prev.selectedBanks.filter(id => id !== bankId)
  //       : [...prev.selectedBanks, bankId];
  //     return { ...prev, selectedBanks };
  //   });
  // };

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
          // selectedBanks: formData.selectedBanks
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

      // case 'banks':
      //   return (
      //     <>
      //       <h1 className={styles.title}>Selecione seus bancos</h1>
      //       <div className={styles.bankGrid}>
      //         {banks.map(bank => (
      //           <div
      //             key={bank.id}
      //             className={`${styles.bankCard} ${
      //               formData.selectedBanks.includes(bank.id) ? styles.selected : ''
      //             }`}
      //             onClick={() => handleBankToggle(bank.id)}
      //           >
      //             <span className={styles.bankName}>{bank.name}</span>
      //           </div>
      //         ))}
      //       </div>
      //     </>
      //   );

      case 'code':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Digite o código</h1>
              <p className={styles.loginSubtitle}>
                Enviamos um código de verificação para {formData.email}
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

          <form onSubmit={handleSubmit}>
            {renderStep()}

            <div className={styles.buttonGroup}>
              {step !== 'email' && (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'name') setStep('email');
                    if (step === 'income') setStep('name');
                    if (step === 'code') setStep(isNewUser ? 'income' : 'email');
                  }}
                  className={`${styles.loginButton} ${styles.secondary}`}
                >
                  Voltar
                </button>
              )}
              <button type="submit" className={styles.loginButton}>
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