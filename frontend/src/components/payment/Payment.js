import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthContext from '../../contexts/AuthContext';
import '../../styles/Payment.css';

const Payment = () => {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
      return;
    }

    fetchSubscriptionStatus();
  }, [auth.token, navigate]);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/payments/status`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao obter status da assinatura');
      }

      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      toast.error('Não foi possível verificar o status da sua assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setProcessingPayment(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/payments/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao iniciar pagamento');
      }

      const data = await response.json();
      toast.success('Pagamento criado com sucesso');
      
      // Aqui seria implementada a integração com o Mercado Pago
      // Por enquanto, apenas atualizamos o status
      setTimeout(() => {
        fetchSubscriptionStatus();
        setProcessingPayment(false);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Não foi possível processar o pagamento');
      setProcessingPayment(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Não disponível';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <h2>Carregando informações...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h1>Status da Assinatura</h1>
        
        {subscription && (
          <div className="subscription-info">
            <p className="subscription-status">
              Status: <span className={subscription.hasSubscription ? 'active' : 'inactive'}>
                {subscription.hasSubscription ? 'Ativa' : 'Inativa'}
              </span>
            </p>
            
            {subscription.hasSubscription ? (
              <>
                <p>Sua assinatura está ativa até <strong>{formatDate(subscription.expiresAt)}</strong></p>
                <p>Dias restantes: <strong>{subscription.daysLeft}</strong></p>
                
                {subscription.daysLeft <= 30 && (
                  <div className="renewal-warning">
                    <p>Sua assinatura está próxima do vencimento. Considere renová-la para continuar utilizando todos os recursos.</p>
                    <button 
                      className="payment-button"
                      onClick={handlePayment}
                      disabled={processingPayment}
                    >
                      {processingPayment ? 'Processando...' : 'Renovar Assinatura'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="subscription-expired">
                <p>Sua assinatura expirou ou você ainda está no período de teste.</p>
                <p>Para continuar utilizando o sistema, é necessário adquirir uma assinatura.</p>
                
                <button 
                  className="payment-button"
                  onClick={handlePayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? 'Processando...' : 'Assinar Agora - R$ 99,90/ano'}
                </button>
                
                <div className="subscription-benefits">
                  <h3>Benefícios da assinatura:</h3>
                  <ul>
                    <li>Acesso ilimitado a todas as funcionalidades</li>
                    <li>Suporte prioritário</li>
                    <li>Receba notificações e alertas personalizados</li>
                    <li>Controle total sobre despesas e receitas</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="payment-info">
          <h3>Informações de Pagamento</h3>
          <p>Aceitamos pagamentos seguros através do Mercado Pago</p>
          <p>A assinatura é renovada anualmente por R$ 99,90</p>
        </div>
      </div>
    </div>
  );
};

export default Payment; 