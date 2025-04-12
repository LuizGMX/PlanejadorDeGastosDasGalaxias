import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthContext from '../../contexts/AuthContext';
import '../../styles/Payment.css';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

const Payment = () => {
  const { auth, apiInterceptor } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [paymentData, setPaymentData] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const statusInterval = useRef(null);
  const [preferenceId, setPreferenceId] = useState(null);

  useEffect(() => {
    initMercadoPago(process.env.REACT_APP_MERCADO_PAGO_PUBLIC_KEY, {
      locale: 'pt-BR'
    });
  }, []);

  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
      return;
    }

    fetchSubscriptionStatus();

    return () => {
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
      }
    };
  }, [auth.token, navigate]);

  useEffect(() => {
    // Se temos um pagamento pendente, verificar o status periodicamente
    if (subscription && subscription.isPending && subscription.paymentId) {
      // Limpar intervalo existente se houver
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
      }
      
      // Verificar a cada 10 segundos
      statusInterval.current = setInterval(() => {
        checkPaymentStatus(subscription.paymentId);
      }, 10000);
      
      // Verificar imediatamente
      checkPaymentStatus(subscription.paymentId);
    }
    
    return () => {
      // Limpar intervalo ao desmontar ou mudar o estado
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
      }
    };
  }, [subscription]);

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

      // Se o interceptor detectou expiração, a resposta terá a flag subscriptionExpired
      if (response.subscriptionExpired) {
        // Já estamos na página de pagamento, então não precisamos redirecionar
        // Apenas atualizar a interface para mostrar que a assinatura expirou
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
      
      // Se temos um pagamento pendente, configura para verificar o status
      if (data.isPending && data.paymentId) {
        checkPaymentStatus(data.paymentId);
      }
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      toast.error('Não foi possível verificar o status da sua assinatura');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId) => {
    if (checkingStatus) return;
    
    try {
      setCheckingStatus(true);
      const response = await apiInterceptor(
        `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/payments/check-payment/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao verificar status do pagamento');
      }

      const data = await response.json();
      
      // Se o pagamento foi aprovado, atualizar a interface
      if (data.status === 'approved') {
        // Limpar o intervalo de verificação
        if (statusInterval.current) {
          clearInterval(statusInterval.current);
        }
        
        toast.success('Pagamento aprovado! Sua assinatura foi ativada.');
        
        // Atualizar o status da assinatura
        fetchSubscriptionStatus();
      }
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePayment = async () => {
    try {
      setProcessingPayment(true);
      const response = await apiInterceptor(
        `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/payments/create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.token}`
          }
        }
      );

      // Verificar se o interceptor detectou algum problema com a assinatura
      if (response.subscriptionExpired) {
        setProcessingPayment(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Falha ao iniciar pagamento');
      }

      const data = await response.json();
      toast.success('Pagamento criado com sucesso. Escolha uma forma de pagamento para continuar.');
      
      // Salvar os dados de pagamento e o preferenceId
      setPaymentData(data);
      setPreferenceId(data.preferenceId);
      
      // Resetar o estado de processamento
      setProcessingPayment(false);
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
                      disabled={processingPayment || paymentData}
                    >
                      {processingPayment ? 'Processando...' : 'Renovar Assinatura'}
                    </button>
                  </div>
                )}
              </>
            ) : subscription.isPending ? (
              <div className="subscription-pending">
                <p>Seu pagamento está sendo processado. Você receberá uma confirmação assim que for aprovado.</p>
                <p>Se preferir, você pode verificar o status do seu pagamento: </p>
                <button 
                  className="payment-check-button"
                  onClick={() => checkPaymentStatus(subscription.paymentId)}
                  disabled={checkingStatus}
                >
                  {checkingStatus ? 'Verificando...' : 'Verificar Status'}
                </button>
                
                {paymentData && paymentData.paymentUrl && (
                  <div className="payment-link">
                    <p>Ou acesse diretamente o link de pagamento:</p>
                    <a 
                      href={paymentData.paymentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="payment-url-button"
                    >
                      Abrir Link de Pagamento
                    </a>
                  </div>
                )}
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
                    {processingPayment ? 'Processando...' : 'Assinar Agora - R$ 99,90/ano'}
                  </button>
                ) : (
                  <div className="payment-methods">
                    <h3>Selecione o método de pagamento:</h3>
                    
                    <div style={{
                      margin: "20px 0",
                      padding: "15px",
                      border: "1px solid var(--primary-color)",
                      borderRadius: "8px",
                      backgroundColor: "#f9f9f9"
                    }}>
                      <h4 style={{marginBottom: "15px"}}>Cartão de Crédito, Débito ou Saldo Mercado Pago</h4>
                      <div className="mp-checkout-container">
                        <Wallet 
                          initialization={{ preferenceId: preferenceId }}
                          customization={{
                            texts: {
                              action: 'pay',
                              valueProp: 'security_safety'
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    {paymentData && paymentData.initPoint && (
                      <div className="direct-payment-button">
                        <p style={{marginBottom: "10px", fontSize: "14px", color: "#666"}}>
                          Se o botão acima não funcionar, utilize o link abaixo:
                        </p>
                        <a 
                          href={paymentData.initPoint} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="payment-url-button"
                          style={{
                            display: "block",
                            textAlign: "center",
                            padding: "12px 20px",
                            margin: "15px auto",
                            backgroundColor: "#009ee3",
                            color: "white",
                            textDecoration: "none",
                            borderRadius: "4px",
                            fontWeight: "bold",
                            width: "100%",
                            maxWidth: "300px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                          }}
                        >
                          Pagar com Mercado Pago
                        </a>
                      </div>
                    )}
                    
                    
                    {paymentData && paymentData.qrCode && (
                      <div className="payment-qrcode">
                        <h4>Pague com PIX</h4>
                        <p>Escaneie o QR Code abaixo com o aplicativo do seu banco</p>
                        <img 
                          src={paymentData.qrCode} 
                          alt="QR Code para pagamento PIX" 
                          style={{
                            maxWidth: "250px",
                            margin: "15px auto",
                            display: "block",
                            border: "1px solid #ddd",
                            padding: "10px",
                            borderRadius: "8px"
                          }}
                        />
                        {paymentData.qrCodeText && (
                          <div className="pix-copy">
                            <p>Ou copie o código PIX abaixo:</p>
                            <div className="pix-code-container">
                              <textarea 
                                readOnly 
                                value={paymentData.qrCodeText}
                                onClick={(e) => {
                                  e.target.select();
                                  navigator.clipboard.writeText(paymentData.qrCodeText);
                                  toast.success('Código PIX copiado!');
                                }}
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  height: "80px",
                                  margin: "10px 0",
                                  cursor: "pointer",
                                  fontSize: "12px"
                                }}
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(paymentData.qrCodeText);
                                  toast.success('Código PIX copiado!');
                                }}
                                style={{
                                  padding: "8px 16px",
                                  background: "var(--primary-color)",
                                  color: "var(--secondary-color)",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  marginTop: "5px"
                                }}
                              >
                                Copiar código PIX
                              </button>
                            </div>
                          </div>
                        )}
                        <p style={{marginTop: "15px", fontStyle: "italic"}}>Após o pagamento, pode levar alguns minutos para confirmarmos seu pagamento.</p>
                      </div>
                    )}
                    
                    {paymentData && paymentData.paymentUrl && !paymentData.qrCode && (
                      <div className="payment-link">
                        <p style={{textAlign: "center", marginBottom: "15px"}}>
                          Se os botões acima não funcionarem, você também pode acessar:
                        </p>
                        <a 
                          href={paymentData.paymentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="payment-url-button"
                          style={{
                            display: "block",
                            textAlign: "center",
                            padding: "12px 20px",
                            margin: "20px auto",
                            backgroundColor: "var(--primary-color)",
                            color: "var(--secondary-color)",
                            textDecoration: "none",
                            borderRadius: "4px",
                            fontWeight: "bold",
                            maxWidth: "300px"
                          }}
                        >
                          Página de Pagamento Alternativa
                        </a>
                      </div>
                    )}
                  </div>
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
          <p>A assinatura é renovada anualmente por R$ 99,90</p>
          <div className="payment-methods-icons">
            <img 
              src="https://logosmarcas.net/wp-content/uploads/2021/03/Mercado-Pago-Logo.png" 
              alt="Métodos de pagamento aceitos pelo Mercado Pago" 
              style={{maxWidth: "250px"}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment; 