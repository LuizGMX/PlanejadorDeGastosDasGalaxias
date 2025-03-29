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
    financialGoalPeriodType: '',
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

  const fetchBanks = async (retryCount = 0, delay = 1000) => {
    try {
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
    }
  };

  const filteredBanks = banks.filter(bank => 
    !formData.selectedBanks.includes(bank.id) && 
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
                disabled={loading}
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
                Nos diga seu nome e quanto deseja gastar por mês
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
                disabled={loading}
              />
              <BsPerson className={styles.inputIcon} />
            </div>
            <div className={styles.inputWrapper}>
              <span className="material-icons" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>savings</span>
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
                disabled={loading}
              />
              <span className="material-icons">search</span>
            </div>
            
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p className={styles.loadingMessage}>Carregando bancos...</p>
              </div>
            ) : error && error.includes("Muitas requisições") ? (
              <div className={styles.retryContainer}>
                <p className={styles.errorMessage}>{error}</p>
                <button 
                  type="button" 
                  className={styles.retryButton}
                  onClick={() => fetchBanks()}
                >
                  Tentar novamente
                </button>
              </div>
            ) : banks.length === 0 ? (
              <div className={styles.retryContainer}>
                <p className={styles.errorMessage}>Não foi possível carregar os bancos.</p>
                <button 
                  type="button" 
                  className={styles.retryButton}
                  onClick={() => fetchBanks()}
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className={styles.banksContainer}>
                <div className={styles.banksList}>
                  <h3>Bancos Disponíveis</h3>
                  <p className={styles.banksDescription}>
                    Selecione os bancos que você utiliza para facilitar o registro de receitas e despesas.
                  </p>
                  <div className={styles.banksGrid}>
                    {filteredBanks.map(bank => (
                      <div
                        key={bank.id}
                        className={styles.bankCard}
                        onClick={() => handleBankSelection(bank.id)}
                      >
                        <div className={styles.bankInfo}>
                          <span className={styles.bankName}>{bank.name}</span>
                        </div>
                        <span className="material-icons">add_circle_outline</span>
                      </div>
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
                    {banks
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
            )}
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
              <p className={styles.fieldHelp}>Digite um nome que identifique seu objetivo (ex: Comprar um carro)</p>
              <input
                type="text"
                name="financialGoalName"
                value={formData.financialGoalName}
                onChange={handleChange}
                className={styles.loginInput}
                placeholder="Nome do objetivo (ex: Comprar um carro)"
                required
                disabled={loading}
              />
            </div>
            <div className={styles.inputWrapper}>
              <p className={styles.fieldHelp}>Valor total que você quer economizar</p>
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
            </div>
            <div className={styles.periodContainer}>
              <div className={styles.inputWrapper}>
                <p className={styles.fieldHelp}>Digite o número de dias/meses/anos para atingir o objetivo</p>
                <div className={styles.inputWithIcon}>
                  <input
                    type="number"
                    name="financialGoalPeriodValue"
                    value={formData.financialGoalPeriodValue}
                    onChange={handleChange}
                    className={styles.loginInput}
                    min="1"
                    placeholder="Ex: 2"
                    required
                    disabled={loading}
                  />
                  
                </div>
              </div>
              <div className={styles.inputWrapper}>
                
                <div className={styles.inputWithIcon}>
                  <select
                    name="financialGoalPeriodType"
                    value={formData.financialGoalPeriodType || ''}
                    onChange={handleChange}
                    className={styles.loginInput}
                    required
                    disabled={loading}
                  >
                  <option value="">Selecione</option>
                    <option value="days">Dias</option>
                    <option value="months">Meses</option>
                    <option value="years" selected>Anos</option>
                  </select>
                  
                </div>
              </div>
            </div>
          </>
        );

      case 'code':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Digite o código de acesso</h1>
              <p className={styles.loginSubtitle}>
                Enviamos um código para seu e-mail {formData.email}
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
                disabled={loading}
              />
              <BsShieldLock className={styles.inputIcon} />
            </div>
            <div className={styles.resendCode}>
              {resendDisabled ? (
                <p className={styles.resendDisabled}>Reenviar código em {resendCountdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={requestAccessCode}
                  className={styles.resendButton}
                  disabled={resendDisabled || loading}
                >
                  Reenviar código
                </button>
              )}
            </div>
          </>
        );

      case 'telegram':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Conecte seu Telegram</h1>
              <p className={styles.loginSubtitle}>
                Deseja vincular seu Telegram agora para registrar gastos e receber notificações?
              </p>
            </div>
            <div className={styles.telegramInfo}>
              <h3>Benefícios:</h3>
              <ul>
                <li>📱 Registre gastos e receitas direto pelo Telegram</li>
                <li>🔔 Receba notificações importantes sobre seus gastos</li>
                <li>📊 Consulte seu saldo e relatórios em tempo real</li>
                <li>⚡ Mais praticidade no seu dia a dia</li>
              </ul>
            </div>
            <div className={styles.buttonGroup}>
              <button 
                type="button"
                onClick={() => {
                  setStep('telegram-steps');
                }}
                className={`${styles.loginButton} ${styles.telegramButton}`}
              >
                Sim, vincular agora
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')} 
                className={styles.skipButton}
              >
                Depois, vou fazer depois
              </button>
            </div>
          </>
        );

      case 'telegram-steps':
        return (
          <>
            <div className={styles.loginHeader}>
              <h1 className={styles.loginTitle}>Vamos vincular seu Telegram</h1>
              <p className={styles.loginSubtitle}>
                Siga os passos abaixo para conectar seu Telegram
              </p>
            </div>
            <div className={styles.verificationSteps}>
              <div className={styles.stepsContainer}>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepContent}>
                    <a 
                      href="https://t.me/PlanejadorDasGalaxiasBot" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                    >
                      <h4>Clique aqui ou no botão abaixo</h4>
                      <p>Isso abrirá nosso bot no Telegram</p>
                    </a>
                  </div>
                </div>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepContent}>
                    <h4>Digite /start</h4>
                    <p>Para iniciar a conversa com o bot</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepContent}>
                    <h4>Digite /verificar</h4>
                    <p>O bot vai pedir seu código de verificação</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>4</div>
                  <div className={styles.stepContent}>
                    <h4>Copie este código</h4>
                    <div className={styles.verificationCodeWrapper}>
                      <p className={styles.verificationCodeDisplay}>
                        {code || (
                          <button
                            type="button"
                            onClick={requestTelegramCode} 
                            className={styles.generateCodeButton}
                            disabled={loading}
                          >
                            {loading ? 'Gerando...' : 'Gerar Código de Verificação'}
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
                          Copiar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>5</div>
                  <div className={styles.stepContent}>
                    <h4>Envie o código quando solicitado</h4>
                    <p>Envie apenas o código, sem comandos adicionais</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>6</div>
                  <div className={styles.stepContent}>
                    <div 
                      onClick={() => navigate('/dashboard')} 
                      style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                    >
                      <h4>Clique aqui se já vinculou seu Telegram</h4>
                      <p>Ir para o dashboard</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.buttonGroup}>
              <a 
                href="https://t.me/PlanejadorDasGalaxiasBot" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.loginButton}
              >
                ABRIR BOT NO TELEGRAM
              </a>
              <button 
                type="button" 
                onClick={() => navigate('/dashboard')} 
                className={styles.backButton}
              >
                PULAR POR ENQUANTO
              </button>
            </div>
          </>
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
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <form onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit()) {
              setLastSubmitTime(Date.now());
              handleSubmit(e);
            } else {
              setError('Por favor, aguarde alguns segundos antes de tentar novamente.');
            }
          }} className={styles.loginForm}>
            {renderStep()}

            {step !== 'telegram' && step !== 'telegram-steps' && (
              <div className={styles.buttonGroup}>
                <button 
                  type="button" 
                  onClick={handleContinue}
                  className={styles.loginButton}
                  disabled={loading || !canSubmit()}
                >
                  {loading ? 'Aguarde...' : step === 'code' ? 'Entrar' : 'Continuar'}
                </button>
                {step !== 'email' && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className={styles.backButton}
                    disabled={loading}
                  >
                    Voltar
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;