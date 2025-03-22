import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import CurrencyInput from 'react-currency-input-field';
import styles from '../styles/login.module.css';
import logo from '../assets/logo.svg';
import { BsEnvelope, BsPerson, BsShieldLock } from 'react-icons/bs';

const Login = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [step, setStep] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    financialGoalName: '',
    financialGoalAmount: '',
    financialGoalDate: '',
    selectedBanks: []
  });
  const [banks, setBanks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/banks`);
        if (!response.ok) {
          throw new Error('Erro ao carregar bancos');
        }
        const data = await response.json();
        // Ordena os bancos por ordem de uso (assumindo que o backend envia o campo usage_count)
        const sortedBanks = data.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
        setBanks(sortedBanks);
      } catch (error) {
        console.error('Erro ao carregar bancos:', error);
      }
    };

    fetchBanks();
  }, []);

  const filteredBanks = banks.filter(bank => 
    bank.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBankSelection = (bankId) => {
    setFormData(prev => ({
      ...prev,
      selectedBanks: prev.selectedBanks.includes(bankId)
        ? prev.selectedBanks.filter(id => id !== bankId)
        : [...prev.selectedBanks, bankId]
    }));
  };

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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/check-email`, {
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
        if (!formData.name.trim()) {
          setError('Nome é obrigatório');
          return;
        }
        setStep('banks');
      } else if (step === 'banks') {
        if (formData.selectedBanks.length === 0) {
          setError('Selecione pelo menos um banco');
          return;
        }
        setStep('goal');
      } else if (step === 'goal') {
        if (!formData.name.trim()) {
          setError('Nome é obrigatório');
          return;
        }
        await requestCode();
        setStep('code');
      } else if (step === 'code') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            code,
            name: formData.name,
            financialGoalName: formData.financialGoalName,
            financialGoalAmount: formData.financialGoalAmount,
            financialGoalDate: formData.financialGoalDate,
            selectedBanks: formData.selectedBanks
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Código inválido');
        }

        const data = await response.json();
        
        // Salvar token no localStorage
        localStorage.setItem('token', data.token);
        
        setAuth({
          token: data.token,
          user: data.user
        });
        
        setSuccess('Login realizado com sucesso!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro. Por favor, tente novamente.');
    }
  };

  const requestCode = async () => {
    try {
      const requestData = isNewUser
        ? {
            email: formData.email,
            name: formData.name,
            financialGoalName: formData.financialGoalName,
            financialGoalAmount: formData.financialGoalAmount,
            financialGoalDate: formData.financialGoalDate,
          }
        : {
            email: formData.email,
            name: formData.name
          };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao enviar código');
      }

      const data = await response.json();
      setSuccess('Código enviado com sucesso! Verifique seu email.');
      
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
      throw error; // Re-throw para ser tratado no handleSubmit
    }
  };

  const requestAccessCode = async () => {
    try {
      const requestData = isNewUser
        ? {
            email: formData.email,
            name: formData.name,
            financialGoalName: formData.financialGoalName,
            financialGoalAmount: formData.financialGoalAmount,
            financialGoalDate: formData.financialGoalDate,
          }
        : {
            email: formData.email,
            name: formData.name
          };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao enviar código');
      }

      const data = await response.json();
      setSuccess('Código enviado com sucesso! Verifique seu email.');
      
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

      case 'banks':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Selecione seus bancos</h1>
              <p className={styles.loginSubtitle}>
                Escolha os bancos que você mais utiliza para facilitar o registro de receitas e despesas
              </p>
            </div>
            <div className={styles.searchContainer}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
                placeholder="Buscar banco..."
              />
              <span className="material-icons">search</span>
            </div>
            <div className={styles.banksContainer}>
              <div className={styles.banksList}>
                <h3>Bancos Disponíveis</h3>
                <p className={styles.banksDescription}>
                  Selecione os bancos que você utiliza para facilitar o registro de receitas e despesas. Você poderá alterar isso posteriormente.
                </p>
                <div className={styles.banksGrid}>
                  {filteredBanks
                    .filter(bank => !formData.selectedBanks.includes(bank.id))
                    .map(bank => (
                      <div
                        key={bank.id}
                        className={styles.bankCard}
                        onClick={() => handleBankSelection(bank.id)}
                      >
                        <div className={styles.bankInfo}>
                          <span className={styles.bankName}>{bank.name}</span>
                          {bank.usage_count > 0 && (
                            <span className={styles.usageCount}>
                              {bank.usage_count} usuários
                            </span>
                          )}
                        </div>
                        <span className="material-icons">add_circle_outline</span>
                      </div>
                    ))}
                  {filteredBanks.length === 0 && (
                    <p className={styles.emptyMessage}>
                      Nenhum banco encontrado com este nome
                    </p>
                  )}
                  {filteredBanks.length > 0 && filteredBanks.length === formData.selectedBanks.length && (
                    <p className={styles.emptyMessage}>
                      Todos os bancos já estão selecionados
                    </p>
                  )}
                </div>
              </div>

              <div className={`${styles.banksList} ${styles.selectedBanksList}`}>
                <div className={styles.selectedBanksHeader}>
                  <h3>Meus Bancos</h3>
                  <span className={styles.selectedCount}>
                    {formData.selectedBanks.length} selecionado(s)
                  </span>
                </div>
                <p className={styles.banksDescription}>
                  Estes bancos aparecerão ao registrar suas movimentações financeiras
                </p>
                <div className={styles.banksGrid}>
                  {filteredBanks
                    .filter(bank => formData.selectedBanks.includes(bank.id))
                    .map(bank => (
                      <div
                        key={bank.id}
                        className={`${styles.bankCard} ${styles.selected}`}
                        onClick={() => handleBankSelection(bank.id)}
                      >
                        <div className={styles.bankInfo}>
                          <span className={styles.bankName}>{bank.name}</span>
                        </div>
                        <span className="material-icons">check_circle</span>
                      </div>
                    ))}
                  {formData.selectedBanks.length === 0 && (
                    <p className={styles.emptyMessage}>
                      Nenhum banco selecionado ainda
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        );

      case 'goal':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Defina seu objetivo financeiro</h1>
              <p className={styles.loginSubtitle}>
                Vamos te ajudar a alcançar suas metas financeiras
              </p>
            </div>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                name="financialGoalName"
                value={formData.financialGoalName}
                onChange={handleChange}
                className={styles.loginInput}
                placeholder="Nome do objetivo (ex: Comprar um carro)"
                required
              />
              <BsPerson className={styles.inputIcon} />
            </div>
            <div className={styles.inputWrapper}>
              <CurrencyInput
                name="financialGoalAmount"
                value={formData.financialGoalAmount}
                onValueChange={(value) => setFormData(prev => ({ ...prev, financialGoalAmount: value || '' }))}
                prefix="R$ "
                decimalSeparator=","
                groupSeparator="."
                className={styles.loginInput}
                placeholder="Valor do objetivo"
                required
              />
              <BsShieldLock className={styles.inputIcon} />
            </div>
            <div className={styles.inputWrapper}>
              <input
                type="date"
                name="financialGoalDate"
                value={formData.financialGoalDate}
                onChange={handleChange}
                className={styles.loginInput}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              <span className="material-icons">calendar_today</span>
            </div>
          </>
        );

      case 'code':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Digite o código de acesso</h1>
              <p className={styles.loginSubtitle}>
                Enviamos um código para seu e-mail
              </p>
            </div>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={styles.loginInput}
                placeholder="Digite o código"
                required
              />
              <BsShieldLock className={styles.inputIcon} />
            </div>
            <div className={styles.resendCode}>
              {resendDisabled ? (
                <p>Reenviar código em {resendCountdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={requestAccessCode}
                  className={styles.resendButton}
                >
                  Reenviar código
                </button>
              )}
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
                    if (step === 'code') setStep(isNewUser ? 'goal' : 'email');
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