import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import LoadingScreen from './shared/LoadingScreen';

// Este componente verifica se o usuário está autenticado e tem uma assinatura ativa
const ProtectedRoute = ({ children, allowWithoutSubscription = false }) => {
  const { auth } = useContext(AuthContext);
  const location = useLocation();

  // Se estiver carregando, mostra a tela de loading
  if (auth.loading) {
    return <LoadingScreen message="Verificando acesso..." />;
  }

  // Se não estiver autenticado, redireciona para login
  if (!auth.token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se a assinatura expirou e a rota não permite acesso sem assinatura
  if (auth.subscriptionExpired && !allowWithoutSubscription) {
    // Mostra mensagem apenas quando não está na página de pagamento
    if (location.pathname !== '/payment') {
      toast.error('Sua assinatura expirou. Por favor, renove para continuar usando o sistema.');
    }
    return <Navigate to="/payment" state={{ from: location }} replace />;
  }

  // Se tudo estiver ok, renderiza o componente filho
  return children;
};

export default ProtectedRoute; 