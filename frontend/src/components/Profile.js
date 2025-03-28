import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import styles from '../styles/shared.module.css';
import CurrencyInput from 'react-currency-input-field';
import { BsDoorOpen, BsBank2 } from 'react-icons/bs';

const Profile = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);

  // Estados do perfil (atualizados localmente enquanto o usuário digita)
  const [formData, setFormData] = useState({
    name: auth.user?.name || '',
    email: auth.user?.email || '',
    financialGoalName: auth.user?.financial_goal_name || '',
    financialGoalAmount: auth.user?.financial_goal_amount?.toString() || '',
    financialGoalPeriodType: auth.user?.financial_goal_period_type || 'years',
    financialGoalPeriodValue: auth.user?.financial_goal_period_value || ''
  });

  // Estados da mudança de email (somente submetidos via clique)
  const [emailChangeData, setEmailChangeData] = useState({
    current_email: auth.user?.email || '',
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
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Atualiza os dados quando o usuário é carregado
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

  // Limpa mensagens após 3 segundos
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  // Timer para código do Telegram
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

  // Atualiza o estado dos inputs sem enviar requisições
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (value, name) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Função para validar campos do objetivo financeiro
  const validateFinancialGoalFields = () => {
    if (!formData.financialGoalName || !formData.financialGoalAmount || !formData.financialGoalPeriodType || !formData.financialGoalPeriodValue) {
      setError('Por favor, preencha todos os campos do objetivo financeiro.');
      return false;
    }
    return true;
  };

  // Envia a atualização do perfil somente via clique
  const saveProfile = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ name: formData.name, email: formData.email })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar perfil');
      }
      const data = await response.json();
      setAuth(prev => ({ ...prev, user: data }));
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar perfil' });
    }
  };

  // Envia a atualização da meta financeira somente via clique
  const saveFinancialGoal = async () => {
    if (!validateFinancialGoalFields()) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          financial_goal_name: formData.financialGoalName,
          financial_goal_amount: formData.financialGoalAmount
            ? parseFloat(formData.financialGoalAmount.toString().replace(/\./g, '').replace(',', '.'))
            : null,
          financial_goal_period_type: formData.financialGoalPeriodType || null,
          financial_goal_period_value: formData.financialGoalPeriodValue
            ? parseInt(formData.financialGoalPeriodValue)
            : null
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar meta financeira');
      }
      const data = await response.json();
      setAuth(prev => ({ ...prev, user: data }));
      setMessage({ type: 'success', text: 'Meta financeira atualizada com sucesso!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar meta financeira' });
    }
  };

  // Atualiza o estado do formulário de email
  const handleEmailInputChange = (e) => {
    const { name, value } = e.target;
    setEmailChangeData(prev => ({ ...prev, [name]: value }));
  };

  // Envia a mudança de email somente via clique
  const changeEmail = useCallback(async () => {
    setMessage(null);
    setError(null);
    try {
      if (emailChangeData.step === 'input') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/change-email/request`, {
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
        } catch {
          throw new Error('Erro ao processar resposta do servidor');
        }
        if (!response.ok) throw new Error(data?.message || 'Aguarde alguns minutos.');
        setEmailChangeData(prev => ({ ...prev, step: 'verify' }));
        setMessage({ type: 'success', text: 'Código de verificação enviado!' });
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
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/change-email/verify`, {
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
        } catch {
          throw new Error('Erro ao processar resposta do servidor');
        }
        if (!response.ok) throw new Error(data?.message || 'Erro na verificação do código.');
        setAuth(prev => ({ ...prev, user: data.user }));
        setEmailChangeData({
          current_email: data.user.email,
          new_email: '',
          code: '',
          step: 'input'
        });
        setMessage({ type: 'success', text: 'Email atualizado com sucesso!' });
      }
    } catch (err) {
      setError(err.message || 'Erro ao processar sua solicitação.');
    }
  }, [auth.token, emailChangeData, setAuth]);

  const resendCode = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/change-email/request`, {
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
      if (!response.ok) throw new Error(data.message || 'Erro ao reenviar código');
      setMessage({ type: 'success', text: 'Novo código enviado!' });
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

  // Solicita código do Telegram apenas quando o usuário clicar no botão
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/telegram/init-verification`, {
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

  const logout = useCallback(() => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('token');
    navigate('/login');
  }, [navigate, setAuth]);

  const getRemainingTime = useCallback(() => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingTime]);

  const BanksList = () => {
    const [banks, setBanks] = useState([]);
    const [selectedBanks, setSelectedBanks] = useState([]);
    const [bankSearch, setBankSearch] = useState('');

    useEffect(() => {
      const fetchBanks = async () => {
        try {
          const [banksResponse, favoritesResponse] = await Promise.all([
            fetch(`${process.env.REACT_APP_API_URL}/api/banks`),
            fetch(`${process.env.REACT_APP_API_URL}/api/banks/favorites`, {
              headers: { 'Authorization': `Bearer ${auth.token}` }
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
      fetchBanks();
    }, [auth.token]);

    const selectBank = useCallback(async (bankId) => {
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
        if (!response.ok) throw new Error('Erro ao atualizar bancos favoritos');
        setSelectedBanks(prev =>
          prev.includes(bankId) ? prev.filter(id => id !== bankId) : [...prev, bankId]
        );
        setMessage({ type: 'success', text: 'Favoritos atualizados!' });
      } catch (error) {
        setError('Erro ao atualizar bancos favoritos');
      }
    }, [auth.token, selectedBanks]);

    const filteredBanks = banks
      .filter(bank => bank.name.toLowerCase().includes(bankSearch.toLowerCase()))
      .sort((a, b) => {
        const aSel = selectedBanks.includes(a.id);
        const bSel = selectedBanks.includes(b.id);
        return aSel === bSel ? a.name.localeCompare(b.name) : aSel ? -1 : 1;
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
              onClick={() => selectBank(bank.id)}
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

  return (
    <div className={styles.mainContainer}>
      <div className={styles.pageHeader}>
        <h1>Meu Perfil</h1>
        <button onClick={logout} className={styles.logoutButton}>
          <BsDoorOpen /> Sair
        </button>
      </div>
      {message && <p className={styles.successMessage}>{message.text}</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}
      <div className={styles.content}>
        <div className={`${styles.cardsGrid} ${styles.twoColumns}`}>
          {/* Coluna Esquerda */}
          <div className={styles.cardColumn}>
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
                <button type="button" onClick={saveProfile} className={styles.submitButton}>
                  Atualizar Informações
                </button>
              </div>
            </div>
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardTitle}>
                <h2>Meta Financeira</h2>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.formGroup}>
                  <p className={styles.fieldHelp}>
                    Digite um nome para identificar seu objetivo (ex: Comprar um carro)
                  </p>
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
                  <p className={styles.fieldHelp}>
                    Valor total que você quer economizar
                  </p>
                  <label htmlFor="financialGoalAmount">Valor da Meta</label>
                  <CurrencyInput
                    id="financialGoalAmount"
                    name="financialGoalAmount"
                    value={formData.financialGoalAmount}
                    onValueChange={(value) => handleCurrencyChange(value, 'financialGoalAmount')}
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
                    <p className={styles.fieldHelp}>
                      Digite o número de dias/meses/anos para atingir o objetivo
                    </p>
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
                    <p className={styles.fieldHelp}>
                      Escolha se quer atingir em dias, meses ou anos
                    </p>
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
                        <option value="years">Anos</option>
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
                <button type="button" onClick={saveFinancialGoal} className={styles.submitButton}>
                  Salvar Meta
                </button>
              </div>
            </div>
          </div>
          {/* Coluna Direita */}
          <div className={styles.cardColumn}>
            {auth.token && auth.user && (
              <div className={styles.dashboardCard}>
                <div className={styles.dashboardTitle}>
                  <h2>Bancos</h2>
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.sectionDescription}>
                    Selecione seus bancos para organizar suas finanças, os marcados com ✓ são os favoritos.
                  </p>
                  <BanksList />
                </div>
              </div>
            )}
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardTitle}>
                <h2>Alterar Email</h2>
              </div>
              <div className={styles.cardBody}>
                {emailChangeData.step === 'input' ? (
                  <>
                    <div className={styles.formGroup}>
                      <label htmlFor="current_email">Email Atual</label>
                      <input
                        type="email"
                        id="current_email"
                        name="current_email"
                        value={emailChangeData.current_email}
                        onChange={handleEmailInputChange}
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
                        onChange={handleEmailInputChange}
                        className={styles.input}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className={styles.formGroup}>
                    <label htmlFor="code">Código de Verificação</label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      value={emailChangeData.code}
                      onChange={handleEmailInputChange}
                      className={styles.input}
                      placeholder="Digite o código recebido"
                      required
                    />
                    {resendDisabled ? (
                      <p className={styles.resendInfo}>Reenviar código em {resendCountdown}s</p>
                    ) : (
                      <button type="button" onClick={resendCode} className={styles.resendButton}>
                        Reenviar Código
                      </button>
                    )}
                  </div>
                )}
                <button type="button" onClick={changeEmail} className={styles.submitButton}>
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
              </div>
            </div>
            <div className={styles.dashboardCard}>
              <div className={styles.dashboardTitle}>
                <h2>Telegram</h2>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.communicationSection}>
                  <h3>Usar Telegram para adicionar gastos rapidamente</h3>
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
                              Acesse{' '}
                              <a
                                href="https://t.me/PlanejadorDeGastosBot"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.botLink}
                              >
                                @PlanejadorDeGastosBot
                              </a>
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
                          type="button"
                          className={`${styles.telegramButton} ${remainingTime > 0 ? styles.waiting : ''}`}
                          onClick={requestTelegramCode}
                          disabled={telegramLoading || remainingTime > 0}
                        >
                          {telegramLoading
                            ? 'Gerando código...'
                            : remainingTime > 0
                            ? `Aguarde ${getRemainingTime()}`
                            : 'GERAR CÓDIGO DE VERIFICAÇÃO'}
                        </button>
                        {telegramError && <p className={styles.telegramError}>{telegramError}</p>}
                        {verificationCode && (
                          <div className={styles.verificationCode}>
                            <span className={styles.code}>{verificationCode}</span>
                            {remainingTime > 0 && (
                              <span className={styles.codeTimer}>Expira em {getRemainingTime()}</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
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
