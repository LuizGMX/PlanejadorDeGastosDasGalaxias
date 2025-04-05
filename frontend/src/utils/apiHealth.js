/**
 * Utilitário para verificar a saúde da API e ajudar no diagnóstico de problemas
 */

export const checkApiHealth = async () => {
  try {
    console.log('Verificando conectividade com a API...');
    console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Tenta acessar a API com um endpoint simples
    const startTime = Date.now();
    const response = await fetch(`${process.env.REACT_APP_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    // Se receber resposta HTML em vez de JSON
    const contentType = response.headers.get('content-type');
    const isHtml = contentType?.includes('text/html');
    
    if (isHtml) {
      const text = await response.text();
      console.error('API retornou HTML em vez de JSON. Possível problema de configuração.', {
        status: response.status,
        contentType,
        htmlSample: text.substring(0, 150)
      });
      return {
        healthy: false,
        status: response.status,
        latency,
        error: 'Resposta HTML recebida',
        isHtml: true,
        htmlSample: text.substring(0, 150)
      };
    }
    
    if (!response.ok) {
      console.error('API retornou status não-OK:', response.status);
      return {
        healthy: false,
        status: response.status,
        latency,
        error: `Status HTTP ${response.status}`
      };
    }
    
    // Tenta parsear a resposta como JSON
    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error('Falha ao parsear resposta JSON:', error);
      return {
        healthy: false,
        status: response.status,
        latency,
        error: 'Falha ao parsear JSON'
      };
    }
    
    console.log('API está acessível:', {
      status: response.status,
      latency: `${latency}ms`,
      data
    });
    
    return {
      healthy: true,
      status: response.status,
      latency,
      data
    };
  } catch (error) {
    console.error('Erro ao verificar saúde da API:', error);
    return {
      healthy: false,
      error: error.message || 'Erro desconhecido'
    };
  }
};

/**
 * Tenta detectar problemas comuns de conectividade com base no erro
 */
export const diagnoseProblem = (healthResult) => {
  if (healthResult.healthy) return 'API está funcionando normalmente';
  
  if (healthResult.error?.includes('NetworkError') || healthResult.error?.includes('Failed to fetch')) {
    return 'Problema de rede: Verifique se o servidor da API está rodando e acessível';
  }
  
  if (healthResult.isHtml) {
    return 'API está retornando HTML em vez de JSON: Provavelmente problema de configuração do REACT_APP_API_URL ou rotas do Nginx';
  }
  
  if (healthResult.status === 404) {
    return 'Endpoint não encontrado: Verifique se a URL da API está correta';
  }
  
  if (healthResult.status >= 500) {
    return 'Erro no servidor: Verifique os logs do backend';
  }
  
  return 'Problema desconhecido: Verifique a configuração e logs';
}; 