import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import styles from '../../styles/shared.module.css';
import { BsDoorOpen } from 'react-icons/bs';

// Importando os novos componentes
import PersonalInfoAndEmail from './PersonalInfoAndEmail';
import FinancialGoal from './FinancialGoal';
import BanksList from './BanksList';
import TelegramVerification from './TelegramVerification';
import Payment from '../Payment';

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

  // Estados da mudança de email
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

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (value, name) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailInputChange = (e) => {
    const { name, value } = e.target;
    setEmailChangeData(prev => ({ ...prev, [name]: value }));
  };

  // Funções de validação
  const validateFinancialGoalFields = () => {
    if (!formData.financialGoalName || !formData.financialGoalAmount || !formData.financialGoalPeriodType || !formData.financialGoalPeriodValue) {
      setError('Por favor, preencha todos os campos do objetivo financeiro.');
      return false;
    }
    return true;
  };

  // Funções de API
  const saveProfile = async () => {
    try {
      // Obter um token válido, tentando primeiro o contexto e depois localStorage
      let token = auth.token;
      if (!token) {
        console.log('Token não encontrado no contexto, buscando do localStorage para saveProfile...');
        token = localStorage.getItem('token');
        if (!token) {
          console.error('Nenhum token de autenticação encontrado para saveProfile');
          navigate('/login');
          return;
        }
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: formData.name, email: formData.email })
      });
      
      // Verificar se a resposta parece ser HTML (possível página de erro 502)
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
      if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
        console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
        console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
        throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
      }
      
      if (!response.ok) {
        try {
          // Parsear o JSON manualmente já que usamos text() acima
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || 'Erro ao atualizar perfil');
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta de erro:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
      }
      
      // Parsear o JSON manualmente já que usamos text() acima
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON da resposta:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }
      
      setAuth(prev => ({ ...prev, user: data }));
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar perfil' });
    }
  };

  const saveFinancialGoal = async () => {
    try {
      console.log('Enviando dados da meta financeira:', {
        financial_goal_name: formData.financialGoalName,
        financial_goal_amount: formData.financialGoalAmount,
        financial_goal_period_type: formData.financialGoalPeriodType,
        financial_goal_period_value: formData.financialGoalPeriodValue
      });

      // Obter um token válido, tentando primeiro o contexto e depois localStorage
      let token = auth.token;
      if (!token) {
        console.log('Token não encontrado no contexto, buscando do localStorage para saveFinancialGoal...');
        token = localStorage.getItem('token');
        if (!token) {
          console.error('Nenhum token de autenticação encontrado para saveFinancialGoal');
          navigate('/login');
          return;
        }
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
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

      // Verificar se a resposta parece ser HTML (possível página de erro 502)
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
      if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
        console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
        console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
        throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
      }

      if (!response.ok) {
        try {
          // Parsear o JSON manualmente já que usamos text() acima
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || 'Erro ao atualizar meta financeira');
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta de erro:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
      }

      // Parsear o JSON manualmente já que usamos text() acima
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON da resposta:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }
      
      console.log('Resposta do servidor:', data);
      
      setAuth(prev => ({ ...prev, user: data }));
      setMessage({ type: 'success', text: 'Meta financeira atualizada com sucesso!' });
    } catch (err) {
      console.error('Erro ao atualizar meta financeira:', err);
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar meta financeira' });
    }
  };

  const changeEmail = useCallback(async () => {
    setMessage(null);
    setError(null);
    try {
      // Obter um token válido, tentando primeiro o contexto e depois localStorage
      let token = auth.token;
      if (!token) {
        console.log('Token não encontrado no contexto, buscando do localStorage para changeEmail...');
        token = localStorage.getItem('token');
        if (!token) {
          console.error('Nenhum token de autenticação encontrado para changeEmail');
          navigate('/login');
          return;
        }
      }

      if (emailChangeData.step === 'input') {
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/change-email/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            current_email: emailChangeData.current_email,
            new_email: emailChangeData.new_email
          })
        });
        
        // Verificar se a resposta parece ser HTML (possível página de erro 502)
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        
        // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
        if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
          console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
          console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
          throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta:', jsonError);
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
        const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/change-email/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            new_email: emailChangeData.new_email,
            code: emailChangeData.code
          })
        });
        
        // Verificar se a resposta parece ser HTML (possível página de erro 502)
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();
        
        // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
        if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
          console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
          console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
          throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta:', jsonError);
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
      console.error('Erro ao mudar email:', err);
      setError(err.message || 'Erro ao processar sua solicitação.');
    }
  }, [auth.token, emailChangeData, setAuth, navigate]);

  const resendCode = useCallback(async () => {
    try {
      // Obter um token válido, tentando primeiro o contexto e depois localStorage
      let token = auth.token;
      if (!token) {
        console.log('Token não encontrado no contexto, buscando do localStorage para resendCode...');
        token = localStorage.getItem('token');
        if (!token) {
          console.error('Nenhum token de autenticação encontrado para resendCode');
          navigate('/login');
          return;
        }
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/change-email/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_email: emailChangeData.current_email,
          new_email: emailChangeData.new_email
        })
      });
      
      // Verificar se a resposta parece ser HTML (possível página de erro 502)
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
      if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
        console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
        console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
        throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON da resposta:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }
      
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
      console.error('Erro ao reenviar código:', err);
      setError(err.message);
    }
  }, [auth.token, emailChangeData, navigate]);

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
      
      // Obter um token válido, tentando primeiro o contexto e depois localStorage
      let token = auth.token;
      if (!token) {
        console.log('Token não encontrado no contexto, buscando do localStorage para requestTelegramCode...');
        token = localStorage.getItem('token');
        if (!token) {
          console.error('Nenhum token de autenticação encontrado para requestTelegramCode');
          navigate('/login');
          return;
        }
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/telegram/init-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Verificar se a resposta parece ser HTML (possível página de erro 502)
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
      if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
        console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
        console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
        throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
      }
      
      // Parsear o JSON manualmente já que usamos text() acima
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON da resposta:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }
      
      if ((response.status === 429 && data.code) || (data.success && data.code)) {
        setVerificationCode(data.code);
        setRemainingTime(300);
      } else {
        throw new Error(data.message || 'Erro ao gerar código');
      }
    } catch (err) {
      console.error('Erro ao solicitar código Telegram:', err);
      setTelegramError(err.message || 'Erro ao solicitar código');
      setTimeout(() => setTelegramError(''), 3000);
    } finally {
      setTelegramLoading(false);
    }
  }, [telegramLoading, auth.token, verificationCode, remainingTime, navigate]);
  
  // Refresh user data from the server
  const refreshUserData = useCallback(async () => {
    try {
      // Obter um token válido, tentando primeiro o contexto e depois localStorage
      let token = auth.token;
      if (!token) {
        console.log('Token não encontrado no contexto, buscando do localStorage para refreshUserData...');
        token = localStorage.getItem('token');
        if (!token) {
          console.error('Nenhum token de autenticação encontrado para refreshUserData');
          navigate('/login');
          return;
        }
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Verificar se a resposta parece ser HTML (possível página de erro 502)
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
      if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
        console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
        console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
        throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
      }
      
      if (response.ok) {
        // Parsear o JSON manualmente já que usamos text() acima
        let userData;
        try {
          userData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta:', jsonError);
          throw new Error('Erro ao processar resposta do servidor');
        }
        
        setAuth({
          ...auth,
          user: userData
        });
        
        if (userData.telegram_verified) {
          setMessage({
            type: 'success',
            text: 'Telegram verificado com sucesso!'
          });
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      setError('Falha ao verificar status do Telegram. Tente novamente.');
    }
  }, [auth, setAuth, navigate]);

  const disconnectTelegram = useCallback(async () => {
    if (telegramLoading) return;
    
    try {
      setTelegramLoading(true);
      setTelegramError('');
      
      // Obter um token válido, tentando primeiro o contexto e depois localStorage
      let token = auth.token;
      if (!token) {
        console.log('Token não encontrado no contexto, buscando do localStorage para disconnectTelegram...');
        token = localStorage.getItem('token');
        if (!token) {
          console.error('Nenhum token de autenticação encontrado para disconnectTelegram');
          navigate('/login');
          return;
        }
      }
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/telegram/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Verificar se a resposta parece ser HTML (possível página de erro 502)
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
      if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
        console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
        console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
        throw new Error('Servidor temporariamente indisponível. Por favor, tente novamente em alguns instantes.');
      }
      
      // Parsear o JSON manualmente já que usamos text() acima
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON da resposta:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao desconectar Telegram');
      }
      
      // Atualiza o usuário com os dados atualizados
      await refreshUserData();
      
      // Exibe mensagem de sucesso
      setMessage({ type: 'success', text: 'Telegram desconectado com sucesso!' });
    } catch (err) {
      console.error('Erro ao desconectar Telegram:', err);
      setTelegramError(err.message || 'Erro ao desconectar Telegram');
      setTimeout(() => setTelegramError(''), 3000);
    } finally {
      setTelegramLoading(false);
    }
  }, [telegramLoading, auth.token, refreshUserData, navigate]);

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

  return (
    <div className={`${styles.mainContainer} withMobileNav`}>
      <div className={styles.pageHeader}>
        <h1 className={styles.profileTitle}>Meu Perfil</h1>
        <button onClick={logout} className={`${styles.logoutButton} desktopLogoutButton`}>
          <BsDoorOpen /> <span>Sair</span>
        </button>
      </div>
      {message && <p className={styles.successMessage}>{message.text}</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}
      <div className={styles.content}>
        <div className={`${styles.cardsGrid} ${styles.twoColumns}`}>
          {/* Coluna Esquerda */}
          <div className={styles.cardColumn}>
            <PersonalInfoAndEmail 
              emailChangeData={emailChangeData}
              handleEmailInputChange={handleEmailInputChange}
              changeEmail={changeEmail}
              resendCode={resendCode}
              resendDisabled={resendDisabled}
              resendCountdown={resendCountdown}
              setEmailChangeData={setEmailChangeData}
            />
            <FinancialGoal 
              formData={formData}
              handleChange={handleChange}
              handleCurrencyChange={handleCurrencyChange}
              saveFinancialGoal={saveFinancialGoal}
              user={auth.user}
            />
          </div>
          {/* Coluna Direita */}
          <div className={styles.cardColumn}>
            {auth.token && auth.user && (
              <BanksList 
                auth={auth}
                setMessage={setMessage}
                setError={setError}
              />
            )}
            <TelegramVerification 
              user={auth.user}
              verificationCode={verificationCode}
              remainingTime={remainingTime}
              telegramError={telegramError}
              telegramLoading={telegramLoading}
              requestTelegramCode={requestTelegramCode}
              disconnectTelegram={disconnectTelegram}
              getRemainingTime={getRemainingTime}
              refreshUserData={refreshUserData}
            />
          </div>
          <Payment />
        </div>
        
        {/* Botão de Logout Mobile */}
        <div className={`${styles.mobileLogoutContainer}`}>
          <button onClick={logout} className={`${styles.mobileLogoutButton}`}>
            <BsDoorOpen size={20} /> <span>Sair da Conta</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
