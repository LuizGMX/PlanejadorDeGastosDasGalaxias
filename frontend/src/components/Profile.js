import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';
import { BsDoorOpen, BsBank2 } from 'react-icons/bs';

const Profile = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);

  // Estados do perfil
  const [formData, setFormData] = useState({
    name: auth.user?.name || '',
    email: auth.user?.email || '',
    financialGoalName: auth.user?.financial_goal_name || '',
    financialGoalAmount: auth.user?.financial_goal_amount?.toString() || '',
    financialGoalPeriodType: auth.user?.financial_goal_period_type || 'years',
    financialGoalPeriodValue: auth.user?.financial_goal_period_value || ''
  });

  // Estados dos bancos
  const [banks, setBanks] = useState([]);
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [bankSearch, setBankSearch] = useState('');

  // Estados da mudança de email
  const [emailChangeData, setEmailChangeData] = useState({
    current_email: '',
    new_email: '',
    code: '',
    step: 'input'
  });
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Estados do Telegram
  const [verificationCode, setVerificationCode] = useState('');
  const [telegramError, setTelegramError] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Estados de mensagens
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Efeitos
  useEffect(() => {
    if (auth.user) {
      setFormData({
        name: auth.user.name || '',
        email: auth.user.email || '',
        financialGoalName: auth.user.financial_goal_name || '',
        financialGoalAmount: auth.user.financial_goal_amount?.toString() || '',
        financialGoalPeriodType: auth.user.financial_goal_period_type || 'years',
        financialGoalPeriodValue: auth.user.financial_goal_period_value || ''
      });
      setEmailChangeData(prev => ({
        ...prev,
        current_email: auth.user.email || ''
      }));
    }
  }, [auth.user]);

  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const [banksResponse, favoritesResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/banks`),
          fetch(`${process.env.REACT_APP_API_URL}/api/banks/favorites`, {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          })
        ]);

        if (!banksResponse.ok || !favoritesResponse.ok) {
          throw new Error('Erro ao carregar bancos');
        }

        const [allBanks, favorites] = await Promise.all([
          banksResponse.json(),
          favoritesResponse.json()
        ]);

        setBanks(allBanks);
        setSelectedBanks(favorites.map(bank => bank.id));
      } catch (error) {
        console.error('Erro ao carregar bancos:', error);
      }
    };

    if (auth.token) {
      fetchBanks();
    }
  }, [auth.token]);

  // Timer do código do Telegram
  useEffect(() => {
    let timer;
    if (remainingTime > 0) {
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
    return () => clearInterval(timer);
  }, [remainingTime]);

  // Handlers do perfil
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          financial_goal_name: formData.financialGoalName,
          financial_goal_amount: formData.financialGoalAmount ? parseFloat(formData.financialGoalAmount.toString().replace(/\./g, '').replace(',', '.')) : null,
          financial_goal_period_type: formData.financialGoalPeriodType || null,
          financial_goal_period_value: formData.financialGoalPeriodValue ? parseInt(formData.financialGoalPeriodValue) : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar perfil');
      }

      const data = await response.json();
      setAuth(prev => ({
        ...prev,
        user: data
      }));
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setMessage({ type: 'error', text: error.message || 'Erro ao atualizar perfil' });
    }
  };

  // Handlers de mudança de email
  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailChangeData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailChangeSubmit = useCallback(async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      if (emailChangeData.step === 'input') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/change-email/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            current_email: emailChangeData.current_email,
            new_email: emailChangeData.new_email
          })
        });

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          throw new Error('Erro ao processar resposta do servidor');
        }

        if (!response.ok) {
          throw new Error(data?.message || 'Muitas requisições. Por favor, aguarde alguns minutos antes de tentar novamente.');
        }

        setEmailChangeData(prev => ({ ...prev, step: 'verify' }));
        setMessage('Código de verificação enviado para o novo email!');
        
        setResendDisabled(true);
        setResendCountdown(60);
        const countdownInterval = setInterval(() => {
          setResendCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              setResendDisabled(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/change-email/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            new_email: emailChangeData.new_email,
            code: emailChangeData.code
          })
        });

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          throw new Error('Erro ao processar resposta do servidor');
        }

        if (!response.ok) {
          throw new Error(data?.message || 'Erro ao verificar código. Por favor, tente novamente.');
        }

        setAuth(prev => ({
          ...prev,
          user: data.user
        }));

        setEmailChangeData({
          current_email: data.user.email,
          new_email: '',
          code: '',
          step: 'input'
        });

        setMessage('Email atualizado com sucesso!');
      }
    } catch (err) {
      console.error('Erro na mudança de email:', err);
      setError(err.message || 'Erro ao processar sua solicitação. Por favor, tente novamente.');
    }
  }, [auth.token, emailChangeData, setAuth]);

  const handleResendCode = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/change-email/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          current_email: emailChangeData.current_email,
          new_email: emailChangeData.new_email
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao reenviar código');
      }

      setMessage('Novo código de verificação enviado!');
      
      setResendDisabled(true);
      setResendCountdown(60);
      const countdownInterval = setInterval(() => {
        setResendCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  }, [auth.token, emailChangeData]);

  // Handlers dos bancos
  const handleBankSelection = useCallback(async (bankId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/banks/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          bank_id: bankId,
          is_active: !selectedBanks.includes(bankId)
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar bancos favoritos');
      }

      setSelectedBanks(prev =>
        prev.includes(bankId)
          ? prev.filter(id => id !== bankId)
          : [...prev, bankId]
      );

      setMessage('Bancos favoritos atualizados com sucesso!');
    } catch (error) {
      setError('Erro ao atualizar bancos favoritos');
    }
  }, [auth.token, selectedBanks]);

  // Handlers do Telegram
  const handleRequestCode = useCallback(async () => {
    if (telegramLoading) return;

    if (verificationCode && remainingTime > 0) {
      setTelegramError('Você já tem um código válido! Use-o antes de gerar um novo.');
      setTimeout(() => setTelegramError(''), 3000);
      return;
    }

    setTelegramError('');
    try {
      setTelegramLoading(true);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/telegram/init-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      });

      const data = await response.json();

      if (response.status === 429 && data.code) {
        setVerificationCode(data.code);
        setRemainingTime(300);
      } else if (data.success && data.code) {
        setVerificationCode(data.code);
        setRemainingTime(300);
      } else {
        throw new Error(data.message || 'Erro ao gerar código de verificação');
      }
    } catch (err) {
      console.error('Erro ao solicitar código:', err);
      setTelegramError(err.message || 'Erro ao solicitar código de verificação');
      setTimeout(() => setTelegramError(''), 3000);
    } finally {
      setTelegramLoading(false);
    }
  }, [telegramLoading, auth.token, verificationCode, remainingTime]);

  const handleLogout = useCallback(() => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('token');
    navigate('/login');
  }, [navigate, setAuth]);

  const getRemainingTime = useCallback(() => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingTime]);

  // Componentes de formulário
  const renderProfileForm = () => (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="name">Nome</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={styles.input}
          required
          placeholder="Seu nome completo"
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={styles.input}
          required
          placeholder="seu@email.com"
        />
      </div>

      <button type="submit" className={styles.submitButton}>
        Atualizar Informações
      </button>
    </form>
  );

  const renderEmailChangeForm = () => (
    <form onSubmit={handleEmailChangeSubmit} className={styles.form}>
      {emailChangeData.step === 'input' ? (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="current_email">Email Atual</label>
            <input
              type="email"
              id="current_email"
              name="current_email"
              value={emailChangeData.current_email}
              onChange={handleEmailChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="new_email">Novo Email</label>
            <input
              type="email"
              id="new_email"
              name="new_email"
              value={emailChangeData.new_email}
              onChange={handleEmailChange}
              className={styles.input}
              required
            />
          </div>
        </>
      ) : (
        <>
          <div className={styles.formGroup}>
            <label htmlFor="code">Código de Verificação</label>
            <input
              type="text"
              id="code"
              name="code"
              value={emailChangeData.code}
              onChange={handleEmailChange}
              className={styles.input}
              placeholder="Digite o código recebido no novo email"
              required
            />
          </div>

          {resendDisabled ? (
            <p className={styles.resendInfo}>
              Reenviar código em {resendCountdown}s
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendCode}
              className={styles.resendButton}
            >
              Reenviar Código
            </button>
          )}
        </>
      )}

      <button type="submit" className={styles.submitButton}>
        {emailChangeData.step === 'input' ? 'Solicitar Mudança' : 'Verificar Código'}
      </button>

      {emailChangeData.step === 'verify' && (
        <button
          type="button"
          onClick={() => setEmailChangeData(prev => ({ ...prev, step: 'input' }))}
          className={`${styles.button} ${styles.secondary}`}
        >
          Voltar
        </button>
      )}
    </form>
  );

  const renderBanksList = () => {
    const filteredBanks = banks
      .filter(bank => bank.name.toLowerCase().includes(bankSearch.toLowerCase()))
      .sort((a, b) => {
        const aSelected = selectedBanks.includes(a.id);
        const bSelected = selectedBanks.includes(b.id);
        if (aSelected === bSelected) {
          return a.name.localeCompare(b.name);
        }
        return aSelected ? -1 : 1;
      });

    return (
      <div className={styles.banksSection}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Buscar banco..."
            value={bankSearch}
            onChange={(e) => setBankSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.banksGrid}>
          {filteredBanks.map(bank => (
            <div
              key={bank.id}
              className={`${styles.bankCard} ${selectedBanks.includes(bank.id) ? styles.selected : ''}`}
              onClick={() => handleBankSelection(bank.id)}
            >
              <div className={styles.bankCardContent}>
                <BsBank2 className={styles.bankIcon} />
                <div className={styles.bankInfo}>
                  <span className={styles.bankName}>{bank.name}</span>
                </div>
                <div className={styles.bankStatus}>
                  {selectedBanks.includes(bank.id) ? '✓' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTelegramSection = () => (
    <div className={styles.telegramSection}>
      <div className={styles.telegramHeader}>
        <div className={styles.telegramStatus}>
          <span>Status:</span>
          <span className={auth.user?.telegram_verified ? styles.statusVerified : styles.statusUnverified}>
            {auth.user?.telegram_verified ? 'Verificado ✓' : 'Não verificado'}
          </span>
        </div>
      </div>

      {!auth.user?.telegram_verified && (
        <>
          <div className={styles.telegramInstructions}>
            <div className={styles.instructionStep}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>
                Acesse <a href="https://t.me/PlanejadorDeGastosBot" target="_blank" rel="noopener noreferrer" className={styles.botLink}>@PlanejadorDeGastosBot</a>
              </span>
            </div>
            <div className={styles.instructionStep}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>Envie /start para o bot</span>
            </div>
            <div className={styles.instructionStep}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepText}>Gere seu código de verificação</span>
            </div>
            <div className={styles.instructionStep}>
              <span className={styles.stepNumber}>4</span>
              <span className={styles.stepText}>Envie o código para o bot</span>
            </div>
          </div>

          <button 
            className={`${styles.telegramButton} ${remainingTime > 0 ? styles.waiting : ''}`}
            onClick={handleRequestCode}
            disabled={telegramLoading || (remainingTime > 0)}
          >
            {telegramLoading ? 'Gerando código...' : 
             remainingTime > 0 ? `Aguarde ${getRemainingTime()}` : 
             'GERAR CÓDIGO DE VERIFICAÇÃO'}
          </button>

          {telegramError && <p className={styles.telegramError}>{telegramError}</p>}
          
          {verificationCode && (
            <div className={styles.verificationCode}>
              <span className={styles.code}>{verificationCode}</span>
              {remainingTime > 0 && (
                <span className={styles.codeTimer}>
                  Expira em {getRemainingTime()}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className={styles.mainContainer}>
      <div className={styles.pageHeader}>
        <h1>Meu Perfil</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <BsDoorOpen /> Sair
        </button>
      </div>

      {message && <p className={styles.successMessage}>{message.text}</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.content}>
        {/* Cards de Informações */}
        <div className={`${styles.cardsGrid} ${styles.twoColumns}`}>
          {/* Coluna da Esquerda */}
          <div className={styles.cardColumn}>
            {/* Card de Informações Pessoais */}
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardTitle}>
                <h2>Informações Pessoais</h2>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.formGroup}>
                  <label htmlFor="name">Nome</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={styles.input}
                    required
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className={styles.divider} />

                <div className={styles.communicationSection}>
                  <h3>Alterar Email</h3>
                  {renderEmailChangeForm()}
                </div>
              </div>
            </div>

            {/* Card de Meta Financeira */}
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardTitle}>
                <h2>Meta Financeira</h2>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.formGroup}>
                  <p className={styles.fieldHelp}>Digite um nome que identifique seu objetivo (ex: Comprar um carro)</p>
                  <label htmlFor="financialGoalName">Nome da Meta</label>
                  <input
                    type="text"
                    id="financialGoalName"
                    name="financialGoalName"
                    value={formData.financialGoalName}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Ex: Comprar um carro"
                  />
                </div>

                <div className={styles.formGroup}>
                  <p className={styles.fieldHelp}>Valor total que você quer economizar</p>
                  <label htmlFor="financialGoalAmount">Valor da Meta</label>
                  <CurrencyInput
                    id="financialGoalAmount"
                    name="financialGoalAmount"
                    value={formData.financialGoalAmount}
                    onValueChange={(value) => handleChange({ target: { name: 'financialGoalAmount', value } })}
                    className={styles.input}
                    prefix="R$ "
                    decimalScale={2}
                    fixedDecimalLength={2}
                    thousandSeparator="."
                    decimalSeparator=","
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className={styles.periodContainer}>
                  <div className={styles.formGroup}>
                    <p className={styles.fieldHelp}>Digite o número de dias/meses/anos para atingir o objetivo</p>
                    <label htmlFor="financialGoalPeriodValue">Quantidade</label>
                    <div className={styles.inputWithIcon}>
                      <input
                        type="number"
                        id="financialGoalPeriodValue"
                        name="financialGoalPeriodValue"
                        value={formData.financialGoalPeriodValue}
                        onChange={handleChange}
                        className={styles.input}
                        min="1"
                        placeholder="Ex: 2"
                      />
                      <span className="material-icons">schedule</span>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <p className={styles.fieldHelp}>Escolha se quer atingir em dias, meses ou anos</p>
                    <label htmlFor="financialGoalPeriodType">Período</label>
                    <div className={styles.inputWithIcon}>
                      <select
                        id="financialGoalPeriodType"
                        name="financialGoalPeriodType"
                        value={formData.financialGoalPeriodType || 'years'}
                        onChange={handleChange}
                        className={styles.input}
                      >
                        <option value="days">Dias</option>
                        <option value="months">Meses</option>
                        <option value="years" selected>Anos</option>
                      </select>
                      <span className="material-icons">schedule</span>
                    </div>
                  </div>
                </div>

                {auth.user?.financial_goal_start_date && auth.user?.financial_goal_end_date && (
                  <div className={styles.goalDates}>
                    <p>
                      <strong>Início:</strong> {new Date(auth.user.financial_goal_start_date).toLocaleDateString('pt-BR')}
                    </p>
                    <p>
                      <strong>Término:</strong> {new Date(auth.user.financial_goal_end_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                <button type="button" onClick={handleSubmit} className={styles.submitButton}>
                  Salvar Meta
                </button>
              </div>
            </div>
          </div>

          {/* Coluna da Direita */}
          <div className={styles.cardColumn}>
            {/* Card de Bancos */}
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardTitle}>
                <h2>Bancos</h2>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.sectionDescription}>
                  Selecione seus bancos para organizar suas finanças, os marcados com ✓ são os que você já possui como favoritos.
                </p>
                {renderBanksList()}
              </div>
            </div>

            {/* Card de Comunicações */}
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardTitle}>
                <h2>Telegram</h2>
              </div>
              <div className={styles.cardBody}>
                {/* Telegram */}
                <div className={styles.communicationSection}>
                  <h3>Usar Telegram para adicionar gastos/despesas de maneira rápida</h3>
                  {renderTelegramSection()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;