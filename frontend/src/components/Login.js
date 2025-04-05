import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import CurrencyInput from 'react-currency-input-field';
import styles from '../styles/login.module.css';
import logo from '../assets/logo.svg';
import { BsEnvelope, BsPerson, BsShieldLock, BsBank2, BsGraphUp, BsTelegram } from 'react-icons/bs';
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
    desired_budget: ''
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
  const SUBMIT_DELAY = 3000; // 3 segundos entre submissões
  
  // Steps configuration for better progress tracking and visualization
  const stepConfig = {
    email: { index: 1, title: 'Começar', icon: <BsEnvelope /> },
    name: { index: 2, title: 'Perfil', icon: <BsPerson /> },
    banks: { index: 3, title: 'Bancos', icon: <BsBank2 /> },
    goal: { index: 4, title: 'Objetivos', icon: <BsGraphUp /> },
    code: { index: 5, title: 'Verificação', icon: <BsShieldLock /> },
    telegram: { index: 6, title: 'Telegram', icon: <BsTelegram /> },
    'telegram-steps': { index: 6, title: 'Telegram', icon: <BsTelegram /> }
  };

  
  // Animation variants for page transitions
  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 }
  };
  
  // Get total number of steps
  const totalSteps = Object.keys(stepConfig).length - 1; // subtracting duplicate telegram step
  
  // Calculate current progress
  const currentProgress = stepConfig[step] ? (stepConfig[step].index / 6) * 100 : 0;

  const fetchBanks = async (retryCount = 0, delay = 1000) => {
    try {
      setLoading(true);
      setError('');
      console.log('Iniciando busca de bancos...');
      
      const apiUrl = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/banks`;
      console.log('URL da API:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        if (response.status === 429 && retryCount < 3) {
          console.log(`Recebido erro 429, aguardando ${delay}ms antes de tentar novamente...`);
          setError(`Muitas requisições. Tentando novamente em ${delay/1000} segundos...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchBanks(retryCount + 1, delay * 2);
        }
        
        throw new Error(`Erro ao carregar bancos: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Dados recebidos:', data);
      
      if (!Array.isArray(data)) {
        throw new Error('Resposta inválida: dados não são um array');
      }
      
      const sortedBanks = data.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
      console.log('Bancos ordenados:', sortedBanks);
      
      setBanks(sortedBanks);
      return true;
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
      setError('Erro ao carregar bancos. Por favor, tente novamente.');
      setBanks([]);
      throw error; // Re-throw para que o chamador possa tratar o erro
    } finally {
      setLoading(false);
    }
  };

  // Filtered banks with improved search - now matches both name and partial strings
  const filteredBanks = banks.filter(bank => 
    !formData.selectedBanks.includes(bank.id) && 
    bank.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Banks that are popular based on usage count
  const popularBanks = banks
    .filter(bank => bank.usage_count > 0 && !formData.selectedBanks.includes(bank.id))
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 5);

  const handleBankSelection = (bankId) => {
    // Add haptic feedback if supported
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
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
        console.log('REACT_APP_API_PREFIX:' + process.env.REACT_APP_API_PREFIX + ' REACT_APP_API_URL:' + process.env.REACT_APP_API_URL);
        


        const prefix = process.env.REACT_APP_API_PREFIX?.trim();
        const url = `${process.env.REACT_APP_API_URL}${prefix ? `/${prefix}` : ''}/auth/check-email`;
        console.log('URL:' + url);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });

        if (response.status === 429) {
          throw new Error('Muitas tentativas. Por favor, aguarde alguns segundos antes de tentar novamente.');
        }

        const responseText = await response.text();
        console.log('Resposta bruta do check-email:', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON:', jsonError);
          if (!response.ok) {
            throw new Error('Erro ao verificar email. Por favor, tente novamente.');
          }
          throw jsonError;
        }

        if (!response.ok) {
          throw new Error(data.message || 'Erro ao verificar email');
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
      } else if (step === 'name') {
        console.log('Processando etapa "name" no handleSubmit...');
        
        if (!formData.name || !formData.desired_budget) {
          throw new Error('Por favor, preencha todos os campos');
        }
        
        console.log('Campos validados, avançando para "banks"...');
        
        // Primeiro carregamos os bancos e depois mudamos o step
        try {
          console.log('Carregando bancos antes de avançar...');
          await fetchBanks();
          console.log('Bancos carregados com sucesso, avançando para etapa banks');
          setStep('banks');
        } catch (error) {
          console.error('Erro ao carregar bancos:', error);
          setError('Erro ao carregar bancos. Tente novamente em alguns instantes.');
          throw error; // Propaga o erro para que setLoading(false) seja chamado no finally
        }
      } else if (step === 'banks') {
        if (formData.selectedBanks.length === 0) {
          throw new Error('Por favor, selecione pelo menos um banco');
        }
        setStep('goal');
      } else if (step === 'goal') {
        if (!formData.financialGoalName || !formData.financialGoalAmount || !formData.financialGoalPeriodType || !formData.financialGoalPeriodValue) {
          throw new Error('Por favor, preencha todos os campos do objetivo financeiro');
        }
        try {
          const parsedFinancialGoalAmount = formData.financialGoalAmount ? Number(formData.financialGoalAmount.replace(/\./g, '').replace(',', '.')) : 0;
          
          const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/send-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              name: formData.name,
              financialGoalName: formData.financialGoalName,
              financialGoalAmount: parsedFinancialGoalAmount,
              financialGoalPeriodType: formData.financialGoalPeriodType,
              financialGoalPeriodValue: formData.financialGoalPeriodValue
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao enviar código');
          }

          const data = await response.json();
          setSuccess('Código enviado com sucesso! Verifique seu email.');
          setStep('code');
        } catch (error) {
          setError(error.message);
          throw error;
        }
      } else if (step === 'code') {
        if (!code) {
          setError('Por favor, digite o código de verificação');
          return;
        }

        try {
          setLoading(true);
          console.log('Verificando código para usuário:', {
            email: formData.email,
            code: code,
            isNewUser: isNewUser
          });
          
          // Para depuração: simplificar a chamada e os dados enviados
          const verifyData = {
            email: formData.email,
            code: code,
            isNewUser: isNewUser
          };
          
          // Se for um novo usuário, adicionar os dados necessários
          if (isNewUser) {
            console.log('Dados do novo usuário:', {
              name: formData.name,
              desired_budget: formData.desired_budget,
              financialGoal: formData.financialGoalName,
              selectedBanks: formData.selectedBanks
            });
            
            const parsedDesiredBudget = formData.desired_budget ? 
              Number(formData.desired_budget.replace(/\./g, '').replace(',', '.')) : 0;
            const parsedFinancialGoalAmount = formData.financialGoalAmount ? 
              Number(formData.financialGoalAmount.replace(/\./g, '').replace(',', '.')) : 0;
            
            // Adiciona os dados ao objeto de verificação
            verifyData.name = formData.name;
            verifyData.desired_budget = parsedDesiredBudget;
            verifyData.financialGoalName = formData.financialGoalName;
            verifyData.financialGoalAmount = parsedFinancialGoalAmount;
            verifyData.financialGoalPeriodType = formData.financialGoalPeriodType;
            verifyData.financialGoalPeriodValue = formData.financialGoalPeriodValue;
            verifyData.selectedBanks = formData.selectedBanks;
          }
          
          console.log('Enviando dados para verificação:', verifyData);
          
          const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verifyData)
          });

          console.log('Resposta do verify-code (status):', response.status);
          
          // Se a resposta não for bem-sucedida, capturamos o texto da resposta para análise
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta de verificação:', errorText);
            
            // Tenta interpretar a resposta como JSON
            let errorMessage = 'Código inválido';
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorMessage;
            } catch (e) {
              console.error('Erro ao parsear resposta de erro:', e);
            }
            
            throw new Error(errorMessage);
          }

          const data = await response.json();
          console.log('Resposta do verify-code (sucesso):', data);
          
          // Salva o token no localStorage e atualiza o estado de autenticação
          localStorage.setItem('token', data.token);
          setAuth({
            token: data.token,
            user: data.user
          });
          
          // Mostra mensagem de sucesso
          setSuccess(isNewUser ? 'Conta criada com sucesso!' : 'Login realizado com sucesso!');
          
          // Se for novo usuário, oferece opção de conectar ao Telegram
          if (isNewUser) {
            setTimeout(() => {
              setStep('telegram');
            }, 1000);
            return;
          }
          
          // Redireciona após 1.5 segundos para usuários existentes
          setTimeout(() => {
            if (data.redirectTo) {
              navigate(data.redirectTo);
            } else {
              navigate('/dashboard');
            }
          }, 1500);
        } catch (error) {
          console.error('Erro ao verificar código:', error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      } else {
        setSuccess('Telegram connection logic not implemented yet');
      }
    } catch (err) {
      console.error('Erro no handleSubmit:', err);
      setError(err.message || 'Ocorreu um erro. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setLastSubmitTime(Date.now());
    }
  };

  const requestAccessCode = async () => {
    try {
      setLoading(true);
      // Limpar o código existente e resetar o estado
      setCode('');
      setError('');
      // Remover a flag que indica que um código já foi solicitado
      sessionStorage.removeItem(`code_requested_${formData.email}`);
      
      console.log('Solicitando (re)envio de código para:', formData.email, 'isNewUser:', isNewUser);

      // Criando um objeto com os dados necessários para enviar o código
      const codeRequestData = {
        email: formData.email,
        isNewUser: isNewUser
      };
      
      // Se for um novo usuário, incluir dados adicionais necessários
      if (isNewUser) {
        const parsedFinancialGoalAmount = formData.financialGoalAmount ? 
          Number(formData.financialGoalAmount.replace(/\./g, '').replace(',', '.')) : 0;
        
        Object.assign(codeRequestData, {
          name: formData.name,
          financialGoalName: formData.financialGoalName,
          financialGoalAmount: parsedFinancialGoalAmount,
          financialGoalPeriodType: formData.financialGoalPeriodType,
          financialGoalPeriodValue: formData.financialGoalPeriodValue
        });
      }
      
      console.log('Enviando dados para reenvio de código:', codeRequestData);

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codeRequestData)
      });

      console.log('Status da resposta de reenvio:', response.status);

      // Verifica se o código de status indica falha
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta de reenvio:', errorText);
        
        let errorMessage = 'Erro ao enviar código';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error('Erro ao parsear resposta de erro:', e);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Código reenviado com sucesso:', data);
      
      // Limpa o campo de código para o usuário inserir o novo
      setCode('');
      setSuccess('Código enviado com sucesso! Verifique seu email.');
      
      // Configura o estado para impedir reenvios rápidos
      setResendDisabled(true);
      setResendCountdown(60);
      
      // Inicia o contador para reenvio
      const interval = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Erro ao solicitar código:', error);
      setError(error.message || 'Erro ao enviar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLink = async () => {
    try {
      const verificationResponse = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/telegram/init-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token || localStorage.getItem('token')}`
        }
      });

      const data = await verificationResponse.json();
      if (data.success) {
        setBotLink(data.botLink);
        setTelegramStep('link');
        setCode(data.code);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Erro ao vincular Telegram:', err);
      setError(err.message);
    }
  };

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
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/telegram/init-verification`, {
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

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
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
                onChange={handleChange}
                className={styles.loginInput}
                placeholder="Digite seu e-mail"
                required
                disabled={loading}
                autoFocus
              />
              <BsEnvelope className={styles.inputIcon} />
            </motion.div>
          </motion.div>
        );

      case 'name':
        return (
          <motion.div
            key="name-step"
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
                Como podemos te chamar?
              </motion.h1>
              <motion.p 
                className={styles.loginSubtitle}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Nos diga seu nome e quanto deseja gastar por mês
              </motion.p>
            </div>
            <motion.div 
              className={styles.inputWrapper}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.loginInput}
                placeholder="Digite seu nome"
                required
                disabled={loading}
                autoFocus
              />
              <BsPerson className={styles.inputIcon} />
            </motion.div>
            <motion.div 
              className={styles.inputWrapper}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <CurrencyInput
                name="desired_budget"
                value={formData.desired_budget}
                onValueChange={(value) => {
                  console.log('Valor do orçamento:', value);
                  setFormData(prev => ({
                    ...prev,
                    desired_budget: value || ''
                  }));
                }}
                prefix="R$ "
                decimalSeparator=","
                groupSeparator="."
                decimalsLimit={2}
                className={styles.loginInput}
                placeholder="Quanto deseja gastar por mês?"
                required
                disabled={loading}
              />
              <span className={`${styles.inputIcon} material-icons`}>savings</span>
            </motion.div>
          </motion.div>
        );

      case 'banks':
        return (
          <motion.div
            key="banks-step"
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
                Selecione seus bancos
              </motion.h1>
              <motion.p 
                className={styles.loginSubtitle}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Escolha os bancos que você utiliza para facilitar o registro de receitas e despesas
              </motion.p>
            </div>
            
            <motion.div 
              className={styles.searchContainer}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
                placeholder="Buscar banco..."
                disabled={loading}
                autoFocus
              />
              <span className="material-icons">search</span>
            </motion.div>
            
            {loading ? (
              <motion.div 
                className={styles.loadingContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className={styles.loadingSpinner}></div>
                <p className={styles.loadingMessage}>Carregando bancos...</p>
              </motion.div>
            ) : error && error.includes("Muitas requisições") ? (
              <motion.div 
                className={styles.retryContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className={styles.errorMessage}>{error}</p>
                <button 
                  type="button" 
                  className={styles.retryButton}
                  onClick={() => fetchBanks()}
                >
                  Tentar novamente
                </button>
              </motion.div>
            ) : banks.length === 0 ? (
              <motion.div 
                className={styles.retryContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className={styles.errorMessage}>Não foi possível carregar os bancos.</p>
                <button 
                  type="button" 
                  className={styles.retryButton}
                  onClick={() => fetchBanks()}
                >
                  Tentar novamente
                </button>
              </motion.div>
            ) : (
              <motion.div 
                className={styles.banksContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className={styles.banksList}>
                  <h3>Bancos Disponíveis</h3>
                  {searchTerm === '' && popularBanks.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <h4 className={styles.popularBanksTitle}>Mais populares</h4>
                      <div className={styles.popularBanksGrid}>
                        {popularBanks.map((bank, index) => (
                          <motion.div
                            key={bank.id}
                            className={styles.bankCard}
                            onClick={() => handleBankSelection(bank.id)}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <div className={styles.bankInfo}>
                              <span className={styles.bankName}>{bank.name}</span>
                            </div>
                            <span className="material-icons">add_circle_outline</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  <p className={styles.banksDescription}>
                    {searchTerm ? 'Resultados da busca:' : 'Todos os bancos:'}
                  </p>
                  <div className={styles.banksGrid}>
                    {filteredBanks.map((bank, index) => (
                      <motion.div
                        key={bank.id}
                        className={styles.bankCard}
                        onClick={() => handleBankSelection(bank.id)}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className={styles.bankInfo}>
                          <span className={styles.bankName}>{bank.name}</span>
                        </div>
                        <span className="material-icons">add_circle_outline</span>
                      </motion.div>
                    ))}
                    {banks.filter(bank => !formData.selectedBanks.includes(bank.id)).length === 0 && (
                      <p className={styles.emptyMessage}>
                        Nenhum banco disponível
                      </p>
                    )}
                    {filteredBanks.length === 0 && searchTerm !== '' && (
                      <p className={styles.emptyMessage}>
                        Nenhum banco encontrado com este nome
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
                    <AnimatePresence>
                      {banks
                        .filter(bank => formData.selectedBanks.includes(bank.id))
                        .map(bank => (
                          <motion.div
                            key={bank.id}
                            className={`${styles.bankCard} ${styles.selected}`}
                            onClick={() => handleBankSelection(bank.id)}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <div className={styles.bankInfo}>
                              <span className={styles.bankName}>{bank.name}</span>
                            </div>
                            <span className="material-icons">check_circle</span>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                    {formData.selectedBanks.length === 0 && (
                      <p className={styles.emptyMessage}>
                        Nenhum banco selecionado ainda
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        );

      case 'goal':
        return (
          <motion.div
            key="goal-step"
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
                Defina seu objetivo financeiro
              </motion.h1>
              <motion.p 
                className={styles.loginSubtitle}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Vamos te ajudar a alcançar suas metas financeiras
              </motion.p>
            </div>
            
            <motion.div 
              className={styles.goalContainer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div 
                className={styles.inputWrapper}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className={styles.fieldHelp}>Qual é o seu objetivo financeiro?</p>
                <div className={styles.inputWithIcon}>
                  <input
                    type="text"
                    name="financialGoalName"
                    value={formData.financialGoalName}
                    onChange={handleChange}
                    className={styles.loginInput}
                    placeholder="Ex: Comprar um carro, viajar para o exterior..."
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <BsGraphUp className={styles.inputIcon} />
                </div>
              </motion.div>
              
              <motion.div 
                className={styles.inputWrapper}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <p className={styles.fieldHelp}>Quanto você precisa economizar?</p>
                <CurrencyInput
                  name="financialGoalAmount"
                  value={formData.financialGoalAmount}
                  onValueChange={(value) => {
                    console.log('Valor do objetivo:', value);
                    setFormData(prev => ({
                      ...prev,
                      financialGoalAmount: value || ''
                    }));
                  }}
                  prefix="R$ "
                  decimalSeparator=","
                  groupSeparator="."
                  decimalsLimit={2}
                  className={styles.loginInput}
                  placeholder="Valor do objetivo"
                  required
                  disabled={loading}
                />
                <span className={`${styles.inputIcon} material-icons`}>monetization_on</span>
              </motion.div>
              
              <motion.div 
                className={styles.periodContainer}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className={styles.fieldHelp}>Em quanto tempo você quer alcançar este objetivo?</p>
                <div className={styles.periodInputs}>
                  <div className={styles.inputWrapper}>
                    <input
                      type="number"
                      name="financialGoalPeriodValue"
                      value={formData.financialGoalPeriodValue}
                      onChange={handleChange}
                      className={styles.loginInput}
                      min="1"
                      placeholder="Quantidade"
                      required
                      disabled={loading}
                    />
                    <span className={`${styles.inputIcon} material-icons`}>event</span>
                  </div>
                  <div className={styles.inputWrapper}>
                    <select
                      name="financialGoalPeriodType"
                      value={formData.financialGoalPeriodType}
                      onChange={handleChange}
                      className={styles.loginInput}
                      required
                      disabled={loading}
                    >
                      <option value="days">Dias</option>
                      <option value="months">Meses</option>
                      <option value="years">Anos</option>
                    </select>
                    <span className={`${styles.inputIcon} material-icons`}>schedule</span>
                  </div>
                </div>
              </motion.div>
              
              {formData.financialGoalAmount && formData.financialGoalPeriodValue && (
                <motion.div 
                  className={styles.goalCalculation}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className={styles.calculationTitle}>Economia necessária:</p>
                  <div className={styles.calculationResult}>
                    {(() => {
                      try {
                        const amount = parseFloat(formData.financialGoalAmount.replace(/\./g, '').replace(',', '.'));
                        const periodValue = parseInt(formData.financialGoalPeriodValue);
                        let divisor = 1;
                        
                        switch(formData.financialGoalPeriodType) {
                          case 'days':
                            divisor = periodValue;
                            break;
                          case 'months':
                            divisor = periodValue * 30;
                            break;
                          case 'years':
                            divisor = periodValue * 365;
                            break;
                          default:
                            divisor = periodValue;
                        }
                        
                        const dailyAmount = amount / divisor;
                        const monthlyAmount = dailyAmount * 30;
                        
                        return (
                          <>
                            <p>
                              <span>Diário: </span>
                              <strong>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dailyAmount)}
                              </strong>
                            </p>
                            <p>
                              <span>Mensal: </span>
                              <strong>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyAmount)}
                              </strong>
                            </p>
                          </>
                        );
                      } catch (e) {
                        return <p>Preencha todos os campos para calcular</p>;
                      }
                    })()}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        );

      case 'code':
        return (
          <motion.div
            key="code-step"
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
                {isNewUser ? 'Verificação de Acesso' : 'Login'}
              </motion.h1>
              <motion.p 
                className={styles.loginSubtitle}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {isNewUser 
                  ? `Digite o código que enviamos para ${formData.email}`
                  : `Enviamos um código de acesso para ${formData.email}`
                }
              </motion.p>
            </div>
            
            <motion.div 
              className={styles.verificationContainer}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    // Remove espaços e garante apenas números
                    const cleanedCode = e.target.value.replace(/[^0-9]/g, '').substring(0, 6);
                    setCode(cleanedCode);
                  }}
                  className={`${styles.loginInput} ${styles.codeInput}`}
                  placeholder="Digite o código de 6 dígitos"
                  required
                  disabled={loading}
                  autoFocus
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  title="O código deve conter apenas números"
                />
                <BsShieldLock className={styles.inputIcon} />
              </div>
              
              <motion.div 
                className={styles.resendCode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {resendDisabled ? (
                  <p className={styles.resendDisabled}>
                    <span className="material-icons">hourglass_empty</span>
                    Reenviar código em {resendCountdown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={requestAccessCode}
                    className={styles.resendButton}
                    disabled={resendDisabled || loading}
                  >
                    <span className="material-icons">refresh</span>
                    Reenviar código
                  </button>
                )}
              </motion.div>
              
              <motion.div 
                className={styles.codeHelp}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p>
                  <span className="material-icons">help_outline</span>
                  Não recebeu o código? Verifique sua caixa de spam ou lixo eletrônico.
                </p>
              </motion.div>
              
              <motion.div 
                className={styles.verifyButtonContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e)}
                  className={`${styles.loginButton} ${loading ? styles.loading : ''}`}
                  disabled={loading || code.length !== 6}
                >
                
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        );

      case 'telegram':
        return (
          <motion.div
            key="telegram-step"
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
                Conecte seu Telegram
              </motion.h1>
              <motion.p 
                className={styles.loginSubtitle}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Potencialize sua experiência conectando seu Telegram
              </motion.p>
            </div>
            
            <motion.div 
              className={styles.telegramInfo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className={styles.telegramIconContainer}>
                <BsTelegram size={60} className={styles.telegramIcon} />
              </div>
              
              <h3>Benefícios exclusivos:</h3>
              <ul>
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="material-icons">add_circle</span>
                  Registre despesas e receitas direto pelo Telegram
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="material-icons">notifications</span>
                  Receba notificações importantes sobre seus despesas
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <span className="material-icons">trending_up</span>
                  Consulte seu saldo e relatórios em tempo real
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <span className="material-icons">bolt</span>
                  Mais praticidade no seu dia a dia
                </motion.li>
              </ul>
            </motion.div>
            
            <motion.div 
              className={styles.buttonGroup}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <button 
                type="button"
                onClick={() => {
                  setStep('telegram-steps');
                }}
                className={`${styles.loginButton} ${styles.telegramButton}`}
              >
                <BsTelegram className={styles.buttonIcon} />
                Conectar agora
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')} 
                className={styles.skipButton}
              >
                Conectar depois
              </button>
            </motion.div>
          </motion.div>
        );

      case 'telegram-steps':
        return (
          <motion.div
            key="telegram-steps"
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
                Conectar Telegram
              </motion.h1>
              <motion.p 
                className={styles.loginSubtitle}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Siga os passos abaixo para vincular sua conta
              </motion.p>
            </div>
            
            <motion.div 
              className={styles.verificationSteps}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className={styles.stepsContainer}>
                <motion.div 
                  className={styles.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepContent}>
                    <a 
                      href="https://t.me/PlanejadorDasGalaxiasBot" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      <h4>Abra nosso bot no Telegram</h4>
                      <p>Clique aqui para abrir o bot automaticamente</p>
                    </a>
                  </div>
                </motion.div>
                
                <motion.div 
                  className={styles.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepContent}>
                    <h4>Inicie o bot com /start</h4>
                    <p>Digite <strong>/start</strong> para iniciar o bot</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className={styles.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepContent}>
                    <h4>Digite o comando de verificação</h4>
                    <p>Digite <strong>/verificar</strong> no chat</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className={styles.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className={styles.stepNumber}>4</div>
                  <div className={styles.stepContent}>
                    <h4>Use este código de verificação</h4>
                    <div className={styles.verificationCodeWrapper}>
                      {!verificationCode ? (
                        <button
                          type="button"
                          onClick={requestTelegramCode}
                          className={styles.generateCodeButton}
                          disabled={telegramLoading}
                        >
                          {telegramLoading ? (
                            <>
                              <div className={styles.buttonSpinner}></div>
                              Gerando código...
                            </>
                          ) : (
                            'Gerar Código de Verificação'
                          )}
                        </button>
                      ) : (
                        <div className={styles.codeDisplay}>
                          <p className={styles.verificationCodeDisplay}>
                            {verificationCode}
                          </p>
                          <div className={styles.codeTimer}>
                            <span>Expira em {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {telegramError && (
                      <p className={styles.errorMessage}>{telegramError}</p>
                    )}
                  </div>
                </motion.div>
                
                <motion.div 
                  className={styles.step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className={styles.stepNumber}>5</div>
                  <div 
                    className={styles.stepContent}
                    onClick={() => navigate('/dashboard')} 
                    style={{ cursor: 'pointer' }}
                  >
                    <h4>Ir para o Dashboard</h4>
                    <p>Clique aqui quando finalizar a vinculação</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
            
            <motion.div 
              className={styles.buttonGroup}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <a 
                href="https://t.me/PlanejadorDasGalaxiasBot" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`${styles.loginButton} ${styles.telegramButton}`}
              >
                <BsTelegram className={styles.buttonIcon} />
                ABRIR BOT NO TELEGRAM
              </a>
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')} 
                className={styles.skipButton}
              >
                IR PARA O DASHBOARD
              </button>
            </motion.div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const canSubmit = () => {
    const now = Date.now();
    return now - lastSubmitTime >= SUBMIT_DELAY;
  };

  const handleNameStepSubmit = async () => {
    console.log('handleNameStepSubmit chamado');
    
    // Previne submissão se já estiver carregando
    if (loading) {
      console.log('Já está carregando, ignorando chamada');
      return;
    }

    // Valida os campos obrigatórios
    if (!formData.name || !formData.desired_budget) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Avança para a próxima etapa primeiro
      setStep('banks');
      
      // Depois carrega os bancos
      console.log('Carregando bancos...');
      await fetchBanks();
      
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao carregar bancos. Por favor, tente novamente.');
      // Volta para a etapa anterior em caso de erro
      setStep('name');
    } finally {
      setLoading(false);
    }
  };
  
  // Modificando o handleContinue para usar funções específicas para cada etapa
  const handleContinue = () => {
    console.log('handleContinue chamado para etapa:', step);
    
    // Se estiver na etapa 'name', não faz nada (será tratado pelo handleNameStepSubmit)
    if (step === 'name') {
      console.log('handleContinue ignorado para etapa name');
      return;
    }

    // Previne submissão se já estiver carregando
    if (loading) {
      console.log('Já está carregando, ignorando chamada');
      return;
    }

    try {
      const syntheticEvent = { preventDefault: () => {} };
      handleSubmit(syntheticEvent);
    } catch (error) {
      console.error('Erro em handleContinue:', error);
      setError('Ocorreu um erro. Por favor, tente novamente.');
    }
  };

  const handleBack = () => {
    if (step === 'name') setStep('email');
    if (step === 'banks') setStep('name');
    if (step === 'goal') setStep('banks');
    if (step === 'code') setStep(isNewUser ? 'goal' : 'email');
  };

  useEffect(() => {
    let checkTelegramInterval;
    
    if (telegramStep === 'link' && auth.user?.id) {
      checkTelegramInterval = setInterval(async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            if (userData.telegram_verified) {
              clearInterval(checkTelegramInterval);
              setSuccess('Telegram vinculado com sucesso!');
              setTimeout(() => {
                navigate('/dashboard');
              }, 1500);
            }
          }
        } catch (error) {
          console.error('Erro ao verificar status do Telegram:', error);
        }
      }, 3000);
    }

    return () => {
      if (checkTelegramInterval) {
        clearInterval(checkTelegramInterval);
      }
      if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
        window.countdownInterval = null;
      }
    };
  }, [telegramStep, auth.user?.id, navigate]);

  // Gera código do Telegram automaticamente quando chega à etapa apropriada
  useEffect(() => {
    if (step === 'telegram-steps') {
      const token = auth.token || localStorage.getItem('token');
      if (!token) {
        console.error('Tentativa de gerar código sem autenticação');
        setError('Erro de autenticação. Por favor, faça login novamente.');
        navigate('/');
        return;
      }

      if (!code) {
        console.log('Gerando código do Telegram automaticamente...');
        requestTelegramCode();
      }
    }
  }, [step, auth.token]);

  // Efeito para reagir a mudanças no tipo de usuário
  useEffect(() => {
    console.log('Estado isNewUser atualizado:', isNewUser);
  }, [isNewUser]);

  // Efeito para limpar o código quando chegar à etapa de verificação
  useEffect(() => {
    if (step === 'code') {
      console.log('Etapa de verificação de código iniciada, limpando código anterior');
      setCode('');
      
      // Verifica se o campo de email está preenchido e se o isNewUser está definido
      // Importante: só envia o código automaticamente se não houver sucesso anterior
      // e se o código ainda não foi preenchido
      if (formData.email && isNewUser !== null && !success && !code) {
        console.log('Condições para envio automático de código atendidas');
        
        // Usamos uma variável para controlar se já foi solicitado o código nesta sessão
        const codeAlreadyRequested = sessionStorage.getItem(`code_requested_${formData.email}`);
        
        if (!codeAlreadyRequested) {
          console.log('Primeira solicitação de código para', formData.email);
          // Marcamos que já solicitamos o código para este email na sessão atual
          sessionStorage.setItem(`code_requested_${formData.email}`, 'true');
          
          const timer = setTimeout(() => {
            requestAccessCode();
          }, 100);
          return () => clearTimeout(timer);
        } else {
          console.log('Código já foi solicitado anteriormente para', formData.email);
        }
      }
    }
  }, [step]);

  // Atualiza o tempo restante a cada segundo
  useEffect(() => {
    let timer;
    if (verificationCode && remainingTime > 0) {
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
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [verificationCode, remainingTime]);

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginIllustration}>
        <img src={logo} alt="Logo do Planejador de Despesas das Galáxias" className={styles.logo} />
      </div>
      <div className={styles.formContainer}>
        <div className={styles.loginCard}>
          {/* Progress bar for multi-step form */}
          {step !== 'telegram' && step !== 'telegram-steps' && (
            <motion.div 
              className={styles.progressContainer}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className={styles.progressBar}>
                <motion.div 
                  className={styles.progressFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${currentProgress}%` }}
                  transition={{ duration: 0.5 }}
                ></motion.div>
              </div>
              <div className={styles.progressSteps}>
                {Object.entries(stepConfig)
                  .filter(([key]) => !['telegram', 'telegram-steps'].includes(key))
                  .sort((a, b) => a[1].index - b[1].index)
                  .map(([key, config]) => (
                    <div 
                      key={key} 
                      className={`${styles.progressStep} ${step === key ? styles.activeStep : ''} ${stepConfig[step].index >= config.index ? styles.completedStep : ''}`}
                    >
                      <div className={styles.stepIndicator}>
                        {stepConfig[step].index > config.index ? 
                          <span className="material-icons">check</span> : 
                          config.icon || config.index
                        }
                      </div>
                      <span className={styles.stepName}>{config.title}</span>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
          
          {/* Error and success messages */}
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

          <form onSubmit={(e) => {
            e.preventDefault();
            
            // Previne submissão se já estiver carregando
            if (loading) {
              console.log('Formulário ignorado - já está carregando');
              return;
            }
            
            console.log('Formulário submetido na etapa:', step);
            
            // Se estiver na etapa de nome, usa handleNameStepSubmit
            if (step === 'name') {
              console.log('Chamando handleNameStepSubmit via formulário');
              handleNameStepSubmit();
              return;
            }
            
            // Para outras etapas, usa handleSubmit
            console.log('Chamando handleSubmit para outras etapas');
            handleSubmit(e);
          }} className={styles.loginForm}>
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>

            {step !== 'telegram' && step !== 'telegram-steps' && (
              <motion.div 
                className={styles.buttonGroup}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <button 
                  type="button" 
                  onClick={() => {
                    console.log('Botão Continuar clicado na etapa:', step);
                    if (step === 'name') {
                      console.log('Chamando handleNameStepSubmit diretamente');
                      handleNameStepSubmit();
                    } else {
                      console.log('Chamando handleContinue para outras etapas');
                      handleContinue();
                    }
                  }}
                  className={`${styles.loginButton} ${step === 'name' ? styles.nameStepButton : ''}`}
                  disabled={loading}
                  data-step={step}
                  id="continueButton"
                  style={step === 'name' ? {background: '#00d084', fontWeight: 'bold'} : {}}
                >
                  {loading ? (
                    <>
                      <div className={styles.buttonSpinner}></div>
                      Aguarde...
                    </>
                  ) : step === 'code' ? (
                    <>
                      <span className="material-icons">login</span>
                      {isNewUser ? 'Verificar' : 'Entrar'}
                    </>
                  ) : step === 'name' ? (
                    <>
                      <span className="material-icons">arrow_forward</span>
                      Continuar para Seleção de Bancos
                    </>
                  ) : (
                    <>
                      <span className="material-icons">arrow_forward</span>
                      Continuar
                    </>
                  )}
                </button>
                {step !== 'email' && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className={styles.backButton}
                    disabled={loading}
                  >
                    <span className="material-icons">arrow_back</span>
                    Voltar
                  </button>
                )}
              </motion.div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;