import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import styles from '../../styles/subscription-status.module.css';

const SubscriptionStatus = () => {
  const { auth, apiInterceptor } = useContext(AuthContext);
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        setLoading(true);
        
        // Verificar se já expirou pelo contexto
        if (auth.subscriptionExpired) {
          navigate('/payment');
          return;
        }
        
        const response = await apiInterceptor(
          `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/payments/status`,
          {
            headers: {
              'Authorization': `Bearer ${auth.token}`
            }
          }
        );

        // Verificar se o interceptor detectou expiração
        if (response.subscriptionExpired) {
          navigate('/payment');
          return;
        }

        if (!response.ok) {
          throw new Error('Falha ao obter status da assinatura');
        }

        const data = await response.json();
        setSubscription(data);
      } catch (error) {
        console.error('Erro ao verificar assinatura:', error);
      } finally {
        setLoading(false);
      }
    };

    if (auth.token) {
      fetchSubscriptionStatus();
    }
  }, [auth.token, auth.subscriptionExpired, apiInterceptor, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Não disponível';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleClick = () => {
    navigate('/payment');
  };

  if (loading) {
    return <div className={styles.skeletonContainer}></div>;
  }

  // Se não tem dados da assinatura, não exibe nada
  if (!subscription) {
    return null;
  }

  // Se a assinatura está ativa e tem mais de 30 dias, não exibe nada
  if (subscription.hasSubscription && subscription.daysLeft > 30) {
    return null;
  }

  // Se tem pagamento pendente, mostra notificação
  if (subscription.isPending) {
    return (
      <div 
        className={`${styles.subscriptionStatus} ${styles.pending}`}
        onClick={handleClick}
      >
        <div className={styles.statusInfo}>
          <span className={styles.statusTitle}>⏱️ Pagamento em processamento</span>
          <span className={styles.statusDetails}>
            Clique para verificar o status do seu pagamento
          </span>
        </div>
        <div className={styles.actionButton}>
          Verificar
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${styles.subscriptionStatus} ${
        subscription.hasSubscription 
          ? subscription.daysLeft <= 7 
            ? styles.critical 
            : subscription.daysLeft <= 30 
              ? styles.warning 
              : styles.active
          : styles.expired
      }`}
      onClick={handleClick}
    >
      <div className={styles.statusInfo}>
        {subscription.hasSubscription ? (
          <>
            <span className={styles.statusTitle}>
              {subscription.daysLeft <= 7
                ? '⚠️ Assinatura prestes a expirar!'
                : subscription.daysLeft <= 30
                  ? '⚠️ Assinatura expira em breve'
                  : 'Assinatura ativa'}
            </span>
            <span className={styles.statusDetails}>
              {subscription.daysLeft === 0
                ? 'Expira hoje'
                : subscription.daysLeft === 1
                  ? 'Expira amanhã'
                  : `Expira em ${subscription.daysLeft} dias (${formatDate(subscription.expiresAt)})`}
            </span>
          </>
        ) : (
          <>
            <span className={styles.statusTitle}>⚠️ Assinatura expirada</span>
            <span className={styles.statusDetails}>
              Clique para renovar sua assinatura
            </span>
          </>
        )}
      </div>
      <div className={styles.actionButton}>
        {subscription.hasSubscription ? 'Renovar' : 'Assinar agora'}
      </div>
    </div>
  );
};

export default SubscriptionStatus; 