import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email');
  const [isNewUser, setIsNewUser] = useState(false);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const { setAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  const checkEmail = async () => {
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
      console.error('Erro ao verificar email:', error);
      setError('Erro ao verificar email. Tente novamente.');
    }
  };

  const sendCode = async () => {
    try {
      setError('');
      const res = await axios.post('/api/auth/send-code', { email, name: isNewUser ? name : userName });
      setStep('code');
    } catch (error) {
      console.error('Erro ao enviar código:', error);
      setError('Erro ao enviar código. Tente novamente.');
    }
  };

  const verifyCode = async () => {
    try {
      setError('');
      const res = await axios.post('/api/auth/verify-code', { email, code });
      setAuth({ token: res.data.token });
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      setError(error.response?.data?.message || 'Código inválido. Tente novamente.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        {step === 'email' ? (
          <>
            <h2>Entrar ou Criar Conta</h2>
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className={styles.error}>{error}</p>}
            <button onClick={checkEmail}>Continuar</button>
          </>
        ) : step === 'name' ? (
          <>
            <h2>Criar Nova Conta</h2>
            <p className={styles.message}>
              Digite seu nome para criar uma nova conta
            </p>
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error && <p className={styles.error}>{error}</p>}
            <button onClick={sendCode}>Enviar Código</button>
          </>
        ) : (
          <>
            <h2>Digite o Código</h2>
            {isNewUser ? (
              <p className={styles.message}>
                Digite o código enviado ao seu e-mail para finalizar a criação da sua conta. Verifique a caixa de spam.
              </p>
            ) : (
              <p className={styles.message}>
                Bem-vindo de volta, {userName}! Digite o código enviado ao seu e-mail.
              </p>
            )}
            <input
              type="text"
              placeholder="Código recebido"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error && <p className={styles.error}>{error}</p>}
            <button onClick={verifyCode}>Verificar</button>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;