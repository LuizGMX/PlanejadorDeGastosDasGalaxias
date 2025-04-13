import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthContext from '../../contexts/AuthContext';
import '../../styles/Payment.css';


const PaymentResult = () => {
  const { auth, apiInterceptor } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({
    status: '',
    message: '',
    details: ''
  });

  useEffect(() => {
    if (!auth.token) {
      navigate('/login');
      return;
    }
           

    // Obter status do pagamento da URL
    const queryParams = new URLSearchParams(location.search);
    const status = queryParams.get('status');
    const paymentId = queryParams.get('payment_id');
    const preferenceId = queryParams.get('preference_id');
    
    // Verificar o status e configurar a mensagem
    let resultData = {
      status: status || 'unknown',
      message: '',
      details: `ID do pagamento: ${paymentId || 'N/A'}`
    };
    
    switch (status) {
      case 'success':
        resultData.message = 'Pagamento concluído com sucesso!';
        toast.success('Pagamento concluído com sucesso!');
        break;
      case 'pending':
        resultData.message = 'Seu pagamento está em processamento';
        toast.info('Seu pagamento está em processamento');
        break;
      case 'failure':
        resultData.message = 'Houve um problema com seu pagamento';
        toast.error('Houve um problema com seu pagamento');
        break;
      default:
        resultData.message = 'Status do pagamento desconhecido';
        toast.info('Status do pagamento desconhecido');
    }
    
    setResult(resultData);
    setLoading(false);
    
    // Verificar o status no backend, se tiver ID do pagamento
    if (paymentId) {
      checkPaymentStatus(paymentId);
    }
    
    // Limpar parâmetros da URL após 2 segundos
    setTimeout(() => {
      window.history.replaceState({}, document.title, '/payment');
    }, 2000);
  }, [auth.token, location.search, navigate, apiInterceptor]);

  const checkPaymentStatus = async (paymentId) => {
    try {
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

      // Não fazemos nada com a resposta aqui, apenas verificamos
      // para que o backend possa atualizar o status, se necessário
    } catch (error) {
      console.error('Erro ao verificar status do pagamento:', error);
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <h2>Verificando status do pagamento...</h2>
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
          
          <div className="payment-actions">
            <button 
              className="payment-button"
              onClick={handleContinue}
            >
              Continuar para o Dashboard
            </button>
            
            <button 
              className="payment-secondary-button"
              onClick={() => navigate('/payment')}
            >
              Voltar para Pagamentos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResult; 