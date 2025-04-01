import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import CurrencyInput from 'react-currency-input-field';
import styles from '../styles/login.module.css';
import logo from '../assets/logo.svg';
import { BsEnvelope, BsPerson, BsShieldLock, BsBank2, BsGraphUp, BsTelegram } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';

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
      console.log('Iniciando busca de bancos...');
      const apiUrl = `${process.env.REACT_APP_API_URL}/api/banks`;
      console.log('URL da API:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('Status da resposta:', response.status);
      
      if (response.status === 429 && retryCount < 3) {
        console.log(`Recebido erro 429, aguardando ${delay}ms antes de tentar novamente...`);
        setError(`Muitas requisições. Tentando novamente em ${delay/1000} segundos...`);
        
        // Espera pelo tempo de delay antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Tenta novamente com backoff exponencial (dobra o tempo de espera)
        return fetchBanks(retryCount + 1, delay * 2);
      }
      
      if (!response.ok) {
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
      setError(''); // Limpa qualquer erro anterior
    } catch (error) {
      console.error('Erro detalhado ao carregar bancos:', error);
      setError('Erro ao carregar bancos. Por favor, tente novamente.');
      setBanks([]); // Limpa o estado dos bancos em caso de erro
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
    e.preventDefault();
    setError('');
    setSuccess('');

    if (loading) return;
    setLoading(true);

    try {
      if (step === 'email') {
        console.log('Enviando email para verificação:', formData.email);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/check-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });

        if (response.status === 429) {
          throw new Error('Muitas tentativas. Por favor, aguarde alguns segundos antes de tentar novamente.');
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          if (!response.ok) {
            throw new Error('Erro ao verificar email. Por favor, tente novamente.');
          }
          throw jsonError;
        }

        if (!response.ok) {
          throw new Error(data.message || 'Erro ao verificar email');
        }

        console.log('Resposta do check-email:', data);
        setIsNewUser(data.isNewUser);
        setFormData(prev => ({ ...prev, name: data.name || '' }));
        
        if (data.isNewUser) {
          setStep('name');
        } else {
          setStep('code');
        }
      } else if (step === 'name') {
        if (!formData.name || !formData.desired_budget) {
          throw new Error('Por favor, preencha todos os campos');
        }
        setStep('banks');
        await fetchBanks();
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
          
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/send-code`, {
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
          throw new Error('Por favor, digite o código de verificação');
        }
        const parsedDesiredBudget = formData.desired_budget ? Number(formData.desired_budget.replace(/\./g, '').replace(',', '.')) : 0;
        const parsedFinancialGoalAmount = formData.financialGoalAmount ? Number(formData.financialGoalAmount.replace(/\./g, '').replace(',', '.')) : 0;

        console.log('Enviando dados para verify-code:', {
          email: formData.email,
          code,
          name: formData.name,
          desired_budget: parsedDesiredBudget,
          financialGoalName: formData.financialGoalName,
          financialGoalAmount: parsedFinancialGoalAmount,
          financialGoalPeriodType: formData.financialGoalPeriodType,
          financialGoalPeriodValue: formData.financialGoalPeriodValue,
          selectedBanks: formData.selectedBanks
        });

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            code,
            name: formData.name,
            desired_budget: parsedDesiredBudget,
            financialGoalName: formData.financialGoalName,
            financialGoalAmount: parsedFinancialGoalAmount,
            financialGoalPeriodType: formData.financialGoalPeriodType,
            financialGoalPeriodValue: formData.financialGoalPeriodValue,
            selectedBanks: formData.selectedBanks
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Código inválido');
        }

        const data = await response.json();
        console.log('Resposta do verify-code:', data);
        
        localStorage.setItem('token', data.token);
        
        setAuth({
          token: data.token,
          user: data.user
        });
        
        setSuccess('Conta criada com sucesso! Agora vamos conectar seu Telegram...');
        setTimeout(() => {
          setStep('telegram');
        }, 1500);
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
      // Previne múltiplas requisições
      if (resendDisabled) return;
      
      const requestData = isNewUser
        ? {
            email: formData.email,
            name: formData.name,
            financialGoalName: formData.financialGoalName,
            financialGoalAmount: formData.financialGoalAmount,
            financialGoalPeriodType: formData.financialGoalPeriodType,
            financialGoalPeriodValue: formData.financialGoalPeriodValue,
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
      
      setResendDisabled(true);
      setResendCountdown(60);
      
      // Limpa o intervalo anterior se existir
      if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
      }
      
      // Armazena o novo intervalo
      window.countdownInterval = setInterval(() => {
        setResendCountdown(prevCountdown => {
          if (prevCountdown <= 1) {
            clearInterval(window.countdownInterval);
            window.countdownInterval = null;
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

  const handleTelegramLink = async () => {
    try {
      const verificationResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/telegram/init-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  const requestTelegramCode = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/telegram/init-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setCode(data.code);
        setSuccess('Código gerado com sucesso!');
      } else {
        setError(data.message || 'Erro ao gerar código');
      }
    } catch (err) {
      console.error('Erro ao gerar código de verificação:', err);
      setError(err.message || 'Erro ao gerar código');
    } finally {
      setLoading(false);
    }
  };

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
                Entre com seu e-mail para começar a planejar seus gastos de forma intergaláctica
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
                Verificação de Acesso
              </motion.h1>
              <motion.p 
                className={styles.loginSubtitle}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Digite o código que enviamos para <strong>{formData.email}</strong>
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
                  onChange={(e) => setCode(e.target.value)}
                  className={`${styles.loginInput} ${styles.codeInput}`}
                  placeholder="Digite o código de 6 dígitos"
                  required
                  disabled={loading}
                  autoFocus
                  maxLength={6}
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
                  Registre gastos e receitas direto pelo Telegram
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="material-icons">notifications</span>
                  Receba notificações importantes sobre seus gastos
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
                      <p className={styles.verificationCodeDisplay}>
                        {code || (
                          <button
                            type="button"
                            onClick={requestTelegramCode} 
                            className={styles.generateCodeButton}
                            disabled={loading}
                          >
                            {loading ? 'Gerando...' : 'Gerar Código'}
                          </button>
                        )}
                      </p>
                      {code && (
                        <button
                          type="button" 
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                            setSuccess('Código copiado!');
                            setTimeout(() => setSuccess(''), 2000);
                          }}
                          className={styles.copyCodeButton}
                        >
                          <span className="material-icons">content_copy</span>
                        </button>
                      )}
                    </div>
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

  const handleContinue = async () => {
    try {
      if (step === 'email') {
        setStep('name');
      } else if (step === 'name') {
        if (!formData.name || !formData.desired_budget) {
          setError('Por favor, preencha todos os campos');
          return;
        }
        
        setLoading(true);
        try {
          // Primeiro buscamos os bancos
          await fetchBanks();
          // Só avançamos para a próxima etapa se conseguirmos carregar os bancos
          setStep('banks');
        } catch (error) {
          console.error('Erro ao carregar bancos:', error);
          // Não avançamos a etapa se houver erro ao carregar os bancos
        } finally {
          setLoading(false);
        }
      } else if (step === 'banks') {
        if (formData.selectedBanks.length === 0) {
          setError('Por favor, selecione pelo menos um banco');
          return;
        }
        setStep('goal');
      } else if (step === 'goal') {
        console.log('Dados do objetivo financeiro:', {
          name: formData.financialGoalName,
          amount: formData.financialGoalAmount,
          periodType: formData.financialGoalPeriodType,
          periodValue: formData.financialGoalPeriodValue
        });

        // Verifica cada campo individualmente
        if (!formData.financialGoalName) {
          setError('Por favor, preencha o nome do objetivo financeiro');
          return;
        }
        if (!formData.financialGoalAmount) {
          setError('Por favor, preencha o valor do objetivo financeiro');
          return;
        }
        if (!formData.financialGoalPeriodType) {
          setError('Por favor, selecione o tipo de período');
          return;
        }
        if (!formData.financialGoalPeriodValue) {
          setError('Por favor, preencha o valor do período');
          return;
        }

        // Se chegou aqui, todos os campos estão preenchidos
        try {
          setLoading(true);
          const parsedFinancialGoalAmount = formData.financialGoalAmount ? 
            Number(formData.financialGoalAmount.replace(/\./g, '').replace(',', '.')) : 0;
          
          console.log('Valor do objetivo financeiro convertido:', parsedFinancialGoalAmount);

          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/send-code`, {
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

          if (response.status === 429) {
            setError('Muitas requisições. Por favor, aguarde alguns segundos antes de tentar novamente.');
            return;
          }

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao enviar código');
          }

          const data = await response.json();
          setSuccess('Código enviado com sucesso! Verifique seu email.');
          setStep('code');
        } catch (error) {
          console.error('Erro ao enviar código:', error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      } else if (step === 'code') {
        if (!code) {
          setError('Por favor, digite o código de verificação');
          return;
        }

        const parsedDesiredBudget = formData.desired_budget ? 
          Number(formData.desired_budget.replace(/\./g, '').replace(',', '.')) : 0;
        const parsedFinancialGoalAmount = formData.financialGoalAmount ? 
          Number(formData.financialGoalAmount.replace(/\./g, '').replace(',', '.')) : 0;

        console.log('Enviando dados para verify-code:', {
          email: formData.email,
          code,
          name: formData.name,
          desired_budget: parsedDesiredBudget,
          financialGoalName: formData.financialGoalName,
          financialGoalAmount: parsedFinancialGoalAmount,
          financialGoalPeriodType: formData.financialGoalPeriodType,
          financialGoalPeriodValue: formData.financialGoalPeriodValue,
          selectedBanks: formData.selectedBanks
        });

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            code,
            name: formData.name,
            desired_budget: parsedDesiredBudget,
            financialGoalName: formData.financialGoalName,
            financialGoalAmount: parsedFinancialGoalAmount,
            financialGoalPeriodType: formData.financialGoalPeriodType,
            financialGoalPeriodValue: formData.financialGoalPeriodValue,
            selectedBanks: formData.selectedBanks
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Código inválido');
        }

        const data = await response.json();
        console.log('Resposta do verify-code:', data);
        
        localStorage.setItem('token', data.token);
        
        setAuth({
          token: data.token,
          user: data.user
        });
        
        setSuccess('Conta criada com sucesso! Agora vamos conectar seu Telegram...');
        setTimeout(() => {
          setStep('telegram');
        }, 1500);
      }
    } catch (error) {
      console.error('Erro ao continuar:', error);
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
    if (step === 'banks' && banks.length === 0) {
      console.log('Step mudou para banks, buscando bancos...');
      fetchBanks();
    }
  }, [step]);

  useEffect(() => {
    let checkTelegramInterval;
    
    if (telegramStep === 'link' && auth.user?.id) {
      checkTelegramInterval = setInterval(async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
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

  // Gerar código de verificação quando entrar na tela de telegram-steps
  useEffect(() => {
    if (step === 'telegram-steps' && !code && auth.token) {
      requestTelegramCode();
    }
  }, [step, code, auth.token]);

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginIllustration}>
        <img src={logo} alt="Logo do Planejador de Gastos das Galáxias" className={styles.logo} />
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
            if (canSubmit()) {
              setLastSubmitTime(Date.now());
              handleSubmit(e);
            } else {
              setError('Por favor, aguarde alguns segundos antes de tentar novamente.');
            }
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
                  onClick={handleContinue}
                  className={styles.loginButton}
                  disabled={loading || !canSubmit()}
                >
                  {loading ? (
                    <>
                      <div className={styles.buttonSpinner}></div>
                      Aguarde...
                    </>
                  ) : step === 'code' ? (
                    <>
                      <span className="material-icons">login</span>
                      Entrar
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