/**
 * Configuração centralizada para APIs
 * Permite fácil modificação de URLs e prefixos da API
 */

// URL base da API - define a URL conforme ambiente
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://planejadordasgalaxias.com.br'
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000');

// Prefixo da API - em produção não usamos prefixo conforme detectado no server.js
const API_PREFIX = process.env.NODE_ENV === 'production'
  ? ''
  : '/api';

/**
 * Constrói a URL completa da API
 * @param {string} endpoint - O endpoint da API (sem barra inicial)
 * @returns {string} URL completa da API
 */
export const getApiUrl = (endpoint) => {
  // Garante que o endpoint começa com / se não estiver vazio
  const formattedEndpoint = endpoint ? (endpoint.startsWith('/') ? endpoint : `/${endpoint}`) : '';
  
  // Constrói a URL completa
  return `${API_BASE_URL}${API_PREFIX}${formattedEndpoint}`;
};

/**
 * Objeto com endpoints comuns para facilitar o uso
 */
export const API_ENDPOINTS = {
  // Auth
  LOGIN: getApiUrl('auth/login'),
  REGISTER: getApiUrl('auth/register'),
  ME: getApiUrl('auth/me'),
  CHECK_EMAIL: getApiUrl('auth/check-email'),
  SEND_CODE: getApiUrl('auth/send-code'),
  VERIFY_CODE: getApiUrl('auth/verify-code'),
  CHANGE_EMAIL_REQUEST: getApiUrl('auth/change-email/request'),
  CHANGE_EMAIL_VERIFY: getApiUrl('auth/change-email/verify'),
  
  // Payments
  PAYMENT_STATUS: getApiUrl('payments/status'),
  CREATE_PAYMENT: getApiUrl('payments/create-payment'),
  
  // Telegram
  TELEGRAM_INIT: getApiUrl('telegram/init-verification'),
  TELEGRAM_DISCONNECT: getApiUrl('telegram/disconnect'),
  
  // Health
  HEALTH: getApiUrl('health'),
  
  // Outros endpoints podem ser adicionados conforme necessário
};

export default {
  getApiUrl,
  API_ENDPOINTS
}; 