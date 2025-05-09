import fetch from 'node-fetch';

const testAuthRoute = async () => {
  console.log('Testando rota /auth/check-email');
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'teste@example.com' })
    });
    
    console.log('Status da resposta:', response.status);
    
    const responseText = await response.text();
    console.log('Conteúdo da resposta:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Resposta parseada:', data);
    } catch (error) {
      console.log('Não foi possível converter resposta para JSON');
    }
  } catch (error) {
    console.error('Erro ao fazer requisição:', error.message);
    console.error('Detalhes do erro:', error);
  }
}

testAuthRoute(); 