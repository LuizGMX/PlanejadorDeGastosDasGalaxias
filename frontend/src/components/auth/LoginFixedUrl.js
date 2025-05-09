import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import CurrencyInput from 'react-currency-input-field';
import styles from '../../styles/login.module.css';
import logo from '../../assets/logo.svg';
import { BsEnvelope, BsPerson, BsShieldLock, BsBank2, BsGraphUp, BsTelegram, BsXCircle, BsCheckCircle } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [step, setStep] = useState('email');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    financialGoalName: '',
    financialGoalAmount: '',
    financialGoalPeriodType: 'years',
    financialGoalPeriodValue: '',
    selectedBanks: [],
    desired_budget: '',
    acceptedTerms: false
  });
  
  const [banks, setBanks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [telegramStep, setTelegramStep] = useState('input');
  const [botLink, setBotLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [remainingTime, setRemainingTime] = useState(300);
  const [telegramError, setTelegramError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const SUBMIT_DELAY = 3000; // 3 segundos entre submissões
  
  // Configuração para o backend
  const getBackendUrl = () => {
    // Verifica se estamos em produção
    const isProduction = window.location.hostname !== 'localhost';
    return isProduction ? 'https://planejadordasgalaxias.com.br' : 'http://localhost:5000';
  };
  
  const getApiPrefix = () => {
    return '/api';
  };
  
  // Função para construção de URLs para o backend
  const buildApiUrl = (endpoint) => {
    return `${getBackendUrl()}${getApiPrefix()}${endpoint}`;
  };

  const handleSubmit = async (e) => {
    console.log('handleSubmit chamado para etapa:', step, 'evento:', e);
    e.preventDefault();
    setError('');
    setSuccess('');

    if (loading) {
      console.log('handleSubmit ignorado porque loading=true');
      return;
    }
    
    setLoading(true);
    console.log('Loading definido como true');

    try {
      if (step === 'email') {
        console.log('Enviando email para verificação:', formData.email);
        
        try {
          // Usar URL fixa
          const checkEmailUrl = buildApiUrl('/auth/check-email');
          console.log('URL para verificação de email:', checkEmailUrl);
          
          const response = await fetch(checkEmailUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({ email: formData.email })
          });
          
          console.log('Status da resposta:', response.status);
          
          if (!response.ok) {
            throw new Error('Erro ao verificar email. Por favor, tente novamente.');
          }
          
          const responseText = await response.text();
          console.log('Resposta bruta do check-email:', responseText);
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (jsonError) {
            console.error('Erro ao parsear JSON:', jsonError);
            throw new Error('Formato de resposta inválido. Por favor, tente novamente.');
          }
          
          console.log('Resposta do check-email (parseada):', data);
          
          // Atualiza o estado com base na resposta
          const userIsNew = Boolean(data.isNewUser);
          console.log('É um novo usuário?', userIsNew);
          
          setIsNewUser(userIsNew);
          setFormData(prev => ({ 
            ...prev, 
            name: data.name || '',
            email: data.email || formData.email
          }));
          
          if (userIsNew) {
            console.log('Redirecionando para etapa de nome (novo usuário)');
            setStep('name');
          } else {
            console.log('Redirecionando para etapa de código (usuário existente)');
            setStep('code');
            setSuccess('Código enviado com sucesso! Verifique seu email.');
          }
        } catch (error) {
          console.error('Erro ao verificar email:', error);
          setError('Erro ao verificar email. Por favor, tente novamente.');
        }
      } 
      // ... Resto do código do componente Login
    } catch (err) {
      console.error('Erro no handleSubmit:', err);
      setError(err.message || 'Ocorreu um erro. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setLastSubmitTime(Date.now());
    }
  };

  // Retornar apenas o necessário para testar a funcionalidade de checagem de email
  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginIllustration}>
        <img src={logo} alt="Logo do Planejador de Despesas das Galáxias" className={styles.logo} />
      </div>
      <div className={styles.formContainer}>
        <div className={styles.loginCard}>
          {/* Mensagens de erro e sucesso */}
          <AnimatePresence>
            {error && (
              <motion.p 
                className={styles.error}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span className="material-icons">error</span> {error}
              </motion.p>
            )}
            {success && (
              <motion.p 
                className={styles.success}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span className="material-icons">check_circle</span> {success}
              </motion.p>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            <motion.div
              key="email-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.loginHeader}>
                <motion.h1 
                  className={styles.loginTitle}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  Bem-vindo ao Planejador
                </motion.h1>
                <motion.p 
                  className={styles.loginSubtitle}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Entre com seu e-mail para começar a planejar seus despesas de forma intergaláctica
                </motion.p>
              </div>
              <motion.div 
                className={styles.inputWrapper}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={styles.loginInput}
                  placeholder="Digite seu e-mail"
                  required
                  disabled={loading}
                  autoFocus
                />
                <BsEnvelope className={styles.inputIcon} />
              </motion.div>
            </motion.div>

            <motion.div 
              className={styles.buttonGroup}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <button 
                type="submit"
                className={styles.loginButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className={styles.buttonSpinner}></div>
                    Aguarde...
                  </>
                ) : (
                  <>
                    <span className="material-icons">arrow_forward</span>
                    Continuar
                  </>
                )}
              </button>
            </motion.div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 