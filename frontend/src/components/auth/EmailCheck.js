import React, { useState } from 'react';

const EmailCheck = () => {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const isProduction = window.location.hostname !== 'localhost';
      const baseUrl = isProduction ? 'https://planejadordasgalaxias.com.br' : 'http://localhost:5000';
      
      // Tenta a rota direta na raiz primeiro
      const url = `${baseUrl}/check-email-test`;
      console.log('Tentando URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.text();
      console.log('Resposta bruta:', data);
      
      try {
        const jsonData = JSON.parse(data);
        setResult(jsonData);
      } catch (e) {
        setResult({ text: data });
      }
    } catch (error) {
      console.error('Erro:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Teste de Verificação de Email</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          style={{
            background: '#00d084',
            color: '#333',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Verificando...' : 'Verificar Email'}
        </button>
      </form>
      
      {error && (
        <div style={{ padding: '10px', background: '#ffdddd', borderRadius: '4px', marginBottom: '10px' }}>
          <strong>Erro:</strong> {error}
        </div>
      )}
      
      {result && (
        <div style={{ padding: '10px', background: '#ddffdd', borderRadius: '4px' }}>
          <h3>Resultado:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default EmailCheck; 