import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthContext from '../../contexts/AuthContext';
import '../../styles/Payment.css';
import { initMercadoPago } from '@mercadopago/sdk-react';


console.log('Chave pública do Mercado Pago:', process.env.REACT_APP_MERCADOPAGO_PUBLIC_KEY);
// Inicializar MercadoPago com a chave pública
initMercadoPago(process.env.REACT_APP_MERCADOPAGO_PUBLIC_KEY);

const Payment = () => {
  const { auth, apiInterceptor } = useContext(AuthContext);
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
      const response = await apiInterceptor(
        `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/payments/status`,
        {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        }
      );

      if (response.subscriptionExpired) {
        setSubscription({ 
          hasSubscription: false, 
          message: 'Sua assinatura expirou. Por favor, renove para continuar usando o sistema.' 
        });
        setLoading(false);
        return;
      }

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
      const uniqueReference = `${auth.userId}-${Date.now()}`;

      const response = await apiInterceptor(
        `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/payments/create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            external_reference: uniqueReference
          })
        }
      );

      if (response.subscriptionExpired) {
        setProcessingPayment(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Falha ao iniciar pagamento');
      }

      const data = await response.json();
      console.log('Resposta do servidor:', data);
      toast.success('Redirecionando para o Mercado Pago...');
      
      if (data.paymentUrl || data.initPoint) {
        window.location.href = data.paymentUrl || data.initPoint;
      } else {
        throw new Error('URL de pagamento não encontrada');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Não foi possível processar o pagamento');
    } finally {
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
              Status: <span className={subscription.hasSubscription ? 'active' : subscription.isPending ? 'pending' : 'inactive'}>
                {subscription.hasSubscription ? 'Ativa' : subscription.isPending ? 'Pendente' : 'Inativa'}
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
            ) : subscription.isPending ? (
              <div className="subscription-pending">
                <p>Seu pagamento está sendo processado. Você receberá uma confirmação assim que for aprovado.</p>
              </div>
            ) : (
              <div className="subscription-expired">
                <p>Sua assinatura expirou ou você ainda está no período de teste.</p>
                <p>Para continuar utilizando o sistema, é necessário adquirir uma assinatura.</p>
                
                <button 
                  className="payment-button"
                  onClick={handlePayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? 'Processando...' : 'Assinar Agora - R$ 4,99/mês (Pagamento único de R$ 49,90 por ano, ou divida em 10x de R$ 4,99)'}
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
        </div>
      </div>
    </div>
  );
};

export default Payment;