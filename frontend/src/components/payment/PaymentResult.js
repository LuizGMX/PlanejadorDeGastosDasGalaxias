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
  const [toastShown, setToastShown] = useState(false);
  const [result, setResult] = useState({
    status: '', message: '', details: '', paymentData: null
  });

  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
      return;
    }

    const processPaymentResult = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const status = params.get('status') || '';
        const paymentId = params.get('payment_id');
        const merchantOrderId = params.get('merchant_order_id');

        const internalStatus = status || 'unknown';

        let resultData = {
          status: internalStatus,
          message: getMessageForStatus(internalStatus),
          details: `ID do pagamento: ${paymentId || 'N/A'}\nPedido: ${merchantOrderId || 'N/A'}`,
          paymentData: null
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
                paymentData: paymentDetails
              };
              displayToastForStatus(paymentDetails.status);
            }
          } catch (error) {
            console.error('Erro ao verificar status no backend:', error);
            resultData = { ...resultData, status: 'error', message: 'Erro ao verificar status do pagamento' };
            toast.error('Erro ao verificar status do pagamento');
          }
        }

        setResult(resultData);
        try { await refreshSubscriptionStatus(); } catch {};
      } catch (error) {
        console.error('Erro ao processar resultado do pagamento:', error);
        setResult({ status: 'error', message: 'Erro ao processar resultado do pagamento', details: error.message, paymentData: null });
        toast.error('Erro ao processar resultado do pagamento');
      } finally {
        setLoading(false);
        setTimeout(() => window.history.replaceState({}, document.title, '/payment'), 3000);
      }
    };

    processPaymentResult();
  }, [auth.token, location.search, navigate, refreshSubscriptionStatus]);

  const getMessageForStatus = status => {
    switch (status) {
      case 'success': return 'Pagamento concluído com sucesso!';
      case 'pending': return 'Seu pagamento está em processamento';
      case 'failure': return 'Houve um problema com seu pagamento';
      case 'error': return 'Erro no processamento do pagamento';
      default: return 'Status do pagamento desconhecido';
    }
  };

  const displayToastForStatus = status => {
    if (toastShown) return;
    setToastShown(true);
    switch (status) {
      case 'success':
        toast.success('Pagamento concluído com sucesso!');
        break;
      case 'pending':
        toast.info('Seu pagamento está sendo processado. Você receberá uma notificação quando for aprovado.');
        break;
      case 'failure':
        toast.error('Houve um problema com seu pagamento. Por favor, tente novamente.');
        break;
      case 'error':
        toast.error('Ocorreu um erro no processamento do pagamento.');
        break;
      default:
        toast.info('Status do pagamento desconhecido. Entre em contato com o suporte se precisar de ajuda.');
    }
  };

  const checkPaymentStatus = async paymentId => {
    const apiUrl = `${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}`;
    const response = await fetch(`${apiUrl}/payments/check/${paymentId}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) {
      const err = await response.json(); throw new Error(err.message || 'Erro ao verificar status');
    }
    return response.json();
  };

  const handleContinue = () => navigate('/dashboard');
  const tryAgain = () => navigate('/payment');

  if (loading) return (
    <div className="payment-container"><div className="payment-card">
      <h2>Verificando status do pagamento...</h2>
      <div className="loading-spinner" />
    </div></div>
  );

  return (
    <div className="payment-container">
      <div className="payment-card">
        <div className={`payment-result ${result.status}`}>
          <h1>{result.status === 'success' ? '✅ ' : result.status === 'pending' ? '⏱️ ' : result.status === 'failure' ? '❌ ' : '❓ '}{result.message}</h1>
          <p className="payment-details">{result.details}</p>
          <div className="payment-message">
            {result.status === 'success' && <p>Obrigado por sua assinatura! Você agora tem acesso a todas as funcionalidades do sistema.</p>}
            {result.status === 'pending' && <p>Seu pagamento está sendo processado. Isso pode levar alguns instantes. Você receberá uma notificação quando for concluído.</p>}
            {result.status === 'failure' && <p>Não foi possível processar seu pagamento. Por favor, verifique os dados e tente novamente.</p>}
          </div>
          <div className="payment-actions">
            {result.status === 'success' && <button className="payment-button" onClick={handleContinue}>Continuar para o Dashboard</button>}
            {result.status === 'failure' && <button className="payment-button" onClick={tryAgain}>Tentar Novamente</button>}
            <button className="payment-secondary-button" onClick={() => navigate('/payment')}>Voltar para Pagamentos</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;