import React, { createContext, useState, useEffect } from 'react';

// Criar o contexto de autenticação
export const AuthContext = createContext();

// Provedor do contexto de autenticação
export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    // Verificar se há um token armazenado no localStorage
    const token = localStorage.getItem('token');
    return { token, user: null, loading: !!token };
  });

  // Função para buscar os dados do usuário quando houver um token
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          console.log('Tentando buscar dados do usuário com token armazenado');
          const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          // Verificar se a resposta parece ser HTML (possível página de erro 502)
          const contentType = response.headers.get('content-type');
          const responseText = await response.text();
          
          // Se parece ser HTML ou contém <!doctype, é provavelmente uma página de erro
          if (contentType?.includes('text/html') || responseText.toLowerCase().includes('<!doctype')) {
            console.error('Resposta da API contém HTML ao invés de JSON. Possível erro 502 Bad Gateway.');
            console.log('Conteúdo da resposta (primeiros 100 caracteres):', responseText.substring(0, 100));
            
            // Não removemos o token para permitir novas tentativas quando o servidor voltar
            setAuth(prev => ({ ...prev, loading: false }));
            return;
          }
          
          if (response.ok) {
            try {
              // Parsear o JSON manualmente já que usamos text() acima
              const userData = JSON.parse(responseText);
              console.log('Dados do usuário recuperados com sucesso');
              
              setAuth({ 
                token: token, 
                user: userData, 
                loading: false 
              });
            } catch (jsonError) {
              console.error('Erro ao parsear JSON da resposta:', jsonError);
              console.error('Conteúdo da resposta:', responseText);
              setAuth(prev => ({ ...prev, loading: false }));
            }
          } else {
            console.error('Erro na resposta da API (status):', response.status);
            console.error('Conteúdo da resposta:', responseText);
            
            if (response.status === 401) {
              console.log('Token inválido ou expirado, removendo do localStorage');
              localStorage.removeItem('token');
              setAuth({ token: null, user: null, loading: false });
            } else {
              // Para outros erros, mantemos o token para permitir novas tentativas
              setAuth(prev => ({ ...prev, loading: false }));
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          // Verificamos se é problema de conexão (não remover token)
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            console.log('Possível problema de conexão. Mantendo token para novas tentativas.');
          }
          setAuth(prev => ({ ...prev, loading: false }));
        }
      } else {
        setAuth({ token: null, user: null, loading: false });
      }
    };

    fetchUser();
    
    // Adicionar listener para mudanças no localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          fetchUser();
        } else {
          setAuth({ token: null, user: null, loading: false });
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Função para fazer login
  const login = async (email, password) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setAuth({ token: data.token, user: data.user, loading: false });
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Erro ao fazer login' };
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, message: 'Erro de conexão ao tentar fazer login' };
    }
  };

  // Função para fazer logout
  const logout = () => {
    localStorage.removeItem('token');
    setAuth({ token: null, user: null, loading: false });
  };

  // Função para registrar um novo usuário
  const register = async (userData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}${process.env.REACT_APP_API_PREFIX ? `/${process.env.REACT_APP_API_PREFIX}` : ''}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: 'Usuário registrado com sucesso' };
      } else {
        return { success: false, message: data.message || 'Erro ao registrar usuário' };
      }
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return { success: false, message: 'Erro de conexão ao tentar registrar usuário' };
    }
  };

  // Valor do contexto
  const value = {
    auth,
    setAuth,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 