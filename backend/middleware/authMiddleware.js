import jwt from 'jsonwebtoken';
import { models } from '../models/index.js';

export const verifyToken = async (req, res, next) => {
  console.log(`🔑 VERIFICANDO TOKEN PARA: ${req.path}`);
  
  try {
    const authHeader = req.headers.authorization;
    console.log(`   Authorization Header presente: ${!!authHeader}`);
    
    const token = authHeader?.split(' ')[1];
    console.log(`   Token extraído: ${token ? 'Sim' : 'Não'}`);
    
    if (!token) {
      console.log(`   ❌ ERRO: Token não fornecido na requisição`);
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`   ✅ Token verificado com sucesso`);
      console.log(`   Informações do token: userId=${decoded.userId || decoded.id}, email=${decoded.email || 'não presente'}`);
      
      const userId = decoded.userId || decoded.id;
      
      if (!userId) {
        console.log(`   ❌ ERRO: Token inválido - userId não encontrado no payload`);
        return res.status(401).json({ error: 'Token inválido: identificação do usuário ausente' });
      }

      const user = await models.User.findByPk(userId);

      if (!user) {
        console.log(`   ❌ ERRO: Usuário não encontrado: ID=${userId}`);
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      console.log(`   ✅ Usuário autenticado: ID=${user.id}, Email=${user.email}`);
      req.user = user;
      next();
    } catch (error) {
      console.error(`   ❌ ERRO na verificação do JWT:`, error.message);
      console.error(`   Nome do erro: ${error.name}`);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }
      
      return res.status(401).json({ error: `Erro de autenticação: ${error.message}` });
    }
  } catch (error) {
    console.error(`   ❌ ERRO geral na autenticação:`, error.message);
    return res.status(500).json({ error: 'Erro ao autenticar usuário' });
  }
};

export const verifyOwnership = (model) => async (req, res, next) => {
  try {
    const record = await model.findByPk(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    const decryptedUserId = record.user_id;
    
    if (decryptedUserId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    req.record = record;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar propriedade' });
  }
}; 