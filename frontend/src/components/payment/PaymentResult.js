import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthContext from '../../contexts/AuthContext';
import '../../styles/Payment.css';

const PaymentResult = () => {
  const { auth, refreshSubscriptionStatus } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({
    status: '',
    message: '',
    details: '',
    paymentData: null,
  });

  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
      return;
    }

    const processPaymentResult = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const status = queryParams.get('status') || '';
        const paymentId = queryParams.get('payment_id');
        const merchantOrderId = queryParams.get('merchant_order_id');
        const preferenceId = queryParams.get('preference_id');
        const externalReference = queryParams.get('external_reference');

        const internalStatus = status || window.location.pathname.split('/').pop() || 'unknown';

        let resultData = {
          status: internalStatus,
          message: getMessageForStatus(internalStatus),
          details: `ID do pagamento: ${paymentId || 'N/A'}\nPedido: ${merchantOrderId || 'N/A'}`,
          paymentData: null,
        };

        displayToastForStatus(internalStatus);

        if (paymentId) {
          try {
            const paymentDetails = await checkPaymentStatus(paymentId);

            if (paymentDetails) {
              resultData = {
                status: paymentDetails.status,
                message: paymentDetails.message,
                details: `ID do pagamento: ${paymentId}\nMétodo: ${paymentDetails.paymentMethod || 'N/A'}`,
                paymentData: paymentDetails,
              };
              displayToastForStatus(paymentDetails.status);
            }
          } catch (error) {
            console.error('Erro ao verificar status no backend:', error);
            resultData.status = 'error';
            resultData.message = 'Erro ao verificar status do pagamento';
            toast('Erro ao verificar status do pagamento');
          }
        }

        setResult(resultData);

        try {
          await refreshSubscriptionStatus();
        } catch (error) {
          console.error('Erro ao atualizar status da assinatura:', error);
        }
      } catch (error) {
        console.error('Erro ao processar resultado do pagamento:', error);
        setResult({
          status: 'error',
          message: 'Erro ao processar resultado do pagamento',
          details: error.message,
          paymentData: null,
        });
        toast('Erro ao processar resultado do pagamento');
      } finally {
        setLoading(false);
        setTimeout(() => {
          window.history.replaceState({}, document.title, '/payment');
        }, 3000);
      }
    };

    processPaymentResult();
  }, [auth.token, location.search, navigate, refreshSubscriptionStatus]);

  const getMessageForStatus = (status) => {
    switch (status) {
      case 'success':
        return 'Pagamento concluído com sucesso!';
      case 'pending':
        return 'Seu pagamento está em processamento';
      case 'failure':
        return 'Houve um problema com seu pagamento';
      case 'error':
        return 'Erro no processamento do pagamento';
      default:
        return 'Status do pagamento desconhecido';
    }
  };

  const displayToastForStatus = (status) => {
    switch (status) {
      case 'success':
        toast('Pagamento concluído com sucesso!');
        break;
      case 'pending':
        toast('Seu pagamento está sendo processado. Você receberá uma notificação quando for aprovado.');
        break;
      case 'failure':
        toast('Houve um problema com seu pagamento. Por favor, tente novamente.');
        break;
      case 'error':
        toast('Ocorreu um erro no processamento do pagamento.');
        break;
      default:
        toast('Status do pagamento desconhecido. Entre em contato com o suporte se precisar de ajuda.');
    }
  };

  const checkPaymentStatus = async (paymentId) => {
    try {
      const apiUrl = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}`;
      const response = await fetch(`${apiUrl}/payments/check/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao verificar o status do pagamento');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
      throw error;
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const tryAgain = () => {
    navigate('/payment');
  };

  if (loading) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <h2>Verificando status do pagamento...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        <div className={`payment-result ${result.status}`}>
          <h1>
            {result.status === 'success' ? '✅ ' :
             result.status === 'pending' ? '⏱️ ' :
             result.status === 'failure' ? '❌ ' : '❓ '}
            {result.message}
          </h1>

          <p className="payment-details">{result.details}</p>

          <div className="payment-message">
            {result.status === 'success' && (
              <p>Obrigado por sua assinatura! Você agora tem acesso a todas as funcionalidades do sistema.</p>
            )}

            {result.status === 'pending' && (
              <p>Seu pagamento está sendo processado. Isso pode levar alguns instantes. Você receberá uma notificação quando for concluído.</p>
            )}

            {result.status === 'failure' && (
              <p>Não foi possível processar seu pagamento. Por favor, verifique os dados e tente novamente.</p>
            )}
          </div>

          <div className="payment-actions">
            {result.status === 'success' && (
              <button className="payment-button" onClick={handleContinue}>
                Continuar para o Dashboard
              </button>
            )}

            {result.status === 'failure' && (
              <button className="payment-button" onClick={tryAgain}>
                Tentar Novamente
              </button>
            )}

            <button className="payment-secondary-button" onClick={() => navigate('/payment')}>
              Voltar para Pagamentos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;