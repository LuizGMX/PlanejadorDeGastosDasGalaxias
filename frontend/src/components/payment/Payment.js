import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthContext from '../../contexts/AuthContext';
import '../../styles/Payment.css';
import { Wallet, initMercadoPago } from '@mercadopago/sdk-react';

// Inicializar MercadoPago com a chave pública
initMercadoPago("TEST-6843259428100870-092419-deed0d1c053a9c2d56093554d6a039c2-115322747");

const Payment = () => {
  const { auth, apiInterceptor } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [preferenceId, setPreferenceId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [walletLoaded, setWalletLoaded] = useState(false);

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
      const uniqueReference = `${auth.userId}-${Date.now()}`; // Gera um código único com base no ID do usuário e timestamp

      const response = await apiInterceptor(
        `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/payments/create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            external_reference: uniqueReference // Adiciona o campo external_reference
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
      console.log('Resposta do servidor:', data); // Debug da resposta
      toast.success('Pagamento criado com sucesso. Escolha uma forma de pagamento para continuar.');
      
      setPreferenceId(data.preferenceId);
      setPaymentUrl(data.paymentUrl || data.initPoint);
      setProcessingPayment(false);
      
      // Iniciar contador para verificar se o componente Wallet carregou
      setTimeout(() => {
        if (!walletLoaded) {
          console.log('Wallet não carregou em tempo hábil, mostrando botão alternativo');
        }
      }, 5000);
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

  // Verifica se veio da URL de retorno do Mercado Pago
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const status = queryParams.get('status');
    
    if (status) {
      switch (status) {
        case 'success':
          toast.success('Pagamento concluído com sucesso!');
          break;
        case 'failure':
          toast.error('Falha no pagamento. Por favor, tente novamente.');
          break;
        case 'pending':
          toast.info('Seu pagamento está pendente de aprovação.');
          break;
        case 'error':
          toast.error('Ocorreu um erro ao processar seu pagamento.');
          break;
        default:
          break;
      }
      
      // Limpa os parâmetros da URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Atualiza o status da assinatura
      fetchSubscriptionStatus();
    }
  }, []);

  // Função para reiniciar o processo de pagamento
  const restartPaymentProcess = () => {
    setPreferenceId(null);
    setPaymentUrl(null);
    setWalletLoaded(false);
    setProcessingPayment(false);
    toast.info('Processo de pagamento reiniciado.');
  };

  // Renderização condicional do componente de carteira do MercadoPago
  const renderMercadoPagoWallet = () => {
    if (!preferenceId) return null;
    
    console.log('Renderizando Wallet com preferenceId:', preferenceId);
    
    return (
      <div className="payment-methods">
        <h3>Selecione o método de pagamento:</h3>
        <div className="mp-wallet-container">
          <Wallet 
            initialization={{ preferenceId: preferenceId }}
            customization={{ texts: { valueProp: 'smart_option' } }}
            onReady={() => setWalletLoaded(true)}
            onError={(error) => {
              console.error('Erro ao carregar Wallet:', error);
              setWalletLoaded(false);
              toast.error('Não foi possível carregar as opções de pagamento.');
            }}
          />
        </div>
        
        {paymentUrl && (
          <div className="payment-alternative">
            <p>Se o formulário de pagamento não carregar corretamente, você pode usar o link abaixo:</p>
            <a 
              href={paymentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="payment-url-button"
            >
              Abrir Página de Pagamento
            </a>
            
            <button 
              className="payment-secondary-button"
              onClick={restartPaymentProcess}
              style={{ marginTop: '15px' }}
            >
              Reiniciar Processo de Pagamento
            </button>
          </div>
        )}
      </div>
    );
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
                      disabled={processingPayment || preferenceId}
                    >
                      {processingPayment ? 'Processando...' : 'Renovar Assinatura'}
                    </button>
                    {preferenceId && renderMercadoPagoWallet()}
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
                
                {!preferenceId ? (
                  <button 
                    className="payment-button"
                    onClick={handlePayment}
                    disabled={processingPayment}
                  >
                    {processingPayment ? 'Processando...' : 'Assinar Agora - R$ 4,99/mês (Pagamento único de R$ 59,90 por ano, ou divida em 12x de R$ 4,99)'}
                  </button>
                ) : (
                  renderMercadoPagoWallet()
                )}
                
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
          <p>A assinatura é renovada anualmente por R$ 59,90</p>
        </div>
      </div>
    </div>
  );
};

export default Payment;