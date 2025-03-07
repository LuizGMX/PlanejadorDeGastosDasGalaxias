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
  const { setAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  const sendCode = async () => {
    await axios.post('/api/auth/send-code', { email, name });
    setStep('code');
  };

  const verifyCode = async () => {
    const res = await axios.post('/api/auth/verify-code', { email, code });
    setAuth({ token: res.data.token });
    navigate('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        {step === 'email' ? (
          <>
            <h2>Entrar ou Criar Conta</h2>
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={sendCode}>Enviar Código</button>
          </>
        ) : (
          <>
            <h2>Digite o Código</h2>
            <input
              type="text"
              placeholder="Código recebido"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button onClick={verifyCode}>Verificar</button>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;