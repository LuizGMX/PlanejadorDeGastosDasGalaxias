import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { NumericFormat } from 'react-number-format';
import styles from './Login.module.css';

function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [netIncome, setNetIncome] = useState('');
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [step, setStep] = useState('email');
  const [isNewUser, setIsNewUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const { setAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const checkEmail = async () => {
    if (!email || !validateEmail(email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }
    try {
      setError('');
      const res = await axios.post('/api/auth/check-email', { email });
      setIsNewUser(res.data.isNewUser);
      if (res.data.isNewUser) {
        setStep('name');
      } else {
        setUserName(res.data.name);
        await axios.post('/api/auth/send-code', { email, name: res.data.name });
        setStep('code');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao verificar email. Tente novamente.');
    }
  };

  const handleNextStep = () => {
    if (step === 'name') {
      if (!name.trim()) {
        setError('Por favor, insira seu nome.');
        return;
      }
      setStep('netIncome');
    } else if (step === 'netIncome') {
      if (!netIncome || isNaN(netIncome) || netIncome <= 0) {
        setError('Por favor, insira uma renda líquida válida.');
        return;
      }
      setStep('banks');
    } else if (step === 'banks') {
      if (selectedBanks.length === 0) {
        setError('Por favor, selecione pelo menos um banco.');
        return;
      }
      sendCode();
    }
  };

  const toggleBankSelection = (bank) => {
    setSelectedBanks((prev) =>
      prev.includes(bank) ? prev.filter((b) => b !== bank) : [...prev, bank]
    );
  };

  const sendCode = async () => {
    try {
      setError('');
      const payload = { email, name, netIncome: Number(netIncome), selectedBanks };
      const res = await axios.post('/api/auth/send-code', payload);
      if (res.data.message === 'Código enviado com sucesso!') {
        setStep('code');
      } else {
        setError('Resposta inesperada do servidor.');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Erro ao enviar código. Tente novamente.');
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) {
      setError('Por favor, insira o código.');
      return;
    }
    try {
      setError('');
      const res = await axios.post('/api/auth/verify-code', { email, code });
      setAuth({ token: res.data.token });
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.message || 'Código inválido. Tente novamente.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 'email') checkEmail();
    else if (step === 'name' || step === 'netIncome' || step === 'banks') handleNextStep();
    else if (step === 'code') verifyCode();
  };

  return (
    <div className={styles.container}>
      <div className={styles['login-text']}>Entre para começar a mudar a sua vida financeira.</div>
      <div className={styles.form}>
        {step === 'email' && <h2>ENTRAR</h2>}
        {step === 'email' && <p className={styles.helperText}>Por favor, insira seu e-mail para continuar.</p>}
        <form onSubmit={handleSubmit}>
          {step === 'email' ? (
            <>
              <input
                type="email"
                className={styles['login-input']}
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className={styles['login-button']}>Continuar</button>
            </>
          ) : step === 'name' ? (
            <>
              <p className={styles.helperText}>Digite seu nome completo.</p>
              <input
                type="text"
                className={styles['login-input']}
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button type="submit" className={styles['login-button']}>Próximo</button>
            </>
          ) : step === 'netIncome' ? (
            <>
              <p className={styles.helperText}>Informe sua renda líquida mensal.</p>
              <NumericFormat
                className={styles['login-input']}
                placeholder="Renda líquida"
                value={netIncome}
                onValueChange={(values) => setNetIncome(values.floatValue)}
                thousandSeparator={true}
                prefix={'R$ '}
                decimalScale={2}
                fixedDecimalScale={true}
                allowNegative={false}
                isNumericString={true}
              />
              <button type="submit" className={styles['login-button']}>Próximo</button>
            </>
          ) : step === 'banks' ? (
            <>
              <p className={styles.helperText}>Escolha os bancos que deseja adicionar.</p>
              <div className={styles.bankButtons}>
                {['Itaú Unibanco', 'Banco do Brasil', 'Bradesco', 'Caixa Econômica Federal', 'Santander Brasil', 'Nubank', 'Banco Inter', 'BTG Pactual', 'Safra', 'Sicredi', 'Banrisul', 'C6 Bank', 'Banco Pan', 'Original', 'Sicoob', 'Votorantim (Banco BV)', 'BMG', 'Mercantil do Brasil', 'Daycoval', 'Neon'].map(bank => (
                  <button
                    key={bank}
                    type="button"
                    className={`${styles.bankButton} ${selectedBanks.includes(bank) ? styles.selected : ''}`}
                    onClick={() => toggleBankSelection(bank)}
                  >
                    {bank}
                  </button>
                ))}
              </div>
              <button type="submit" className={styles['login-button']}>Próximo</button>
            </>
          ) : step === 'code' ? (
            <>
              {isNewUser ? (
                <p className={styles.message}>
                  Digite o código enviado ao seu e-mail para finalizar a criação da sua conta.
                </p>
              ) : (
                <p className={styles.message}>
                  Bem-vindo de volta, {userName}! Digite o código enviado ao seu e-mail.
                </p>
              )}
              <input
                type="text"
                className={styles['login-input']}
                placeholder="Código recebido"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button type="submit" className={styles['login-button']}>Verificar</button>
            </>
          ) : null}
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;