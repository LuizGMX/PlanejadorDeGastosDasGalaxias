import express from 'express';
import { models } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { checkSubscription } from '../middleware/subscriptionCheck.js';
import sequelize from '../config/db.js';

const router = express.Router();
const { Bank, UserBank } = models;

// Lista de bancos padrão para fallback
const defaultBanks = [
  { id: 1, name: "Caixa Econômica Federal", code: "104" },
  { id: 2, name: "Bradesco", code: "237" },
  { id: 3, name: "Itaú", code: "341" },
  { id: 4, name: "Banco do Brasil", code: "001" },
  { id: 5, name: "Santander", code: "033" },
  { id: 6, name: "Nubank", code: "260" },
  { id: 7, name: "Inter", code: "077" },
  { id: 8, name: "C6 Bank", code: "336" },
  { id: 9, name: "Sicoob", code: "756" },
  { id: 10, name: "Sicredi", code: "748" }
];

// Opções padronizadas para consultas SQL
const standardQueryOptions = {
  type: sequelize.QueryTypes.SELECT,
  timeout: 10000, // 10 segundos de timeout
  plain: false, // Garantir que sempre retorne um array, mesmo com um único resultado
  raw: true // Retornar resultados brutos para melhor performance
};

// Cache para a rota de bancos
let banksCache = {
  data: null,
  timestamp: 0,
  isLoading: false
};

// Função para limpar o cache periodicamente
setInterval(() => {
  banksCache.data = null;
  console.log('Cache de bancos limpo');
}, 3600000); // Limpar a cada 1 hora

// Cache para a rota de bancos ativos do usuário
const usersBanksCache = new Map();

// Cache para bancos favoritos do usuário
const favoritesBanksCache = new Map();

// Função para limpar o cache de bancos do usuário periodicamente
setInterval(() => {
  usersBanksCache.clear();
  favoritesBanksCache.clear();
  console.log('Cache de bancos do usuário limpo');
}, 3600000);

// Rota pública - Listar todos os bancos (sem autenticação)
// Usada durante o cadastro de novos usuários
router.get('/', async (req, res) => {
  // Adicionar timeout para evitar que a requisição fique pendente por muito tempo
  const timeout = setTimeout(() => {
    console.error('Timeout ao listar bancos');
    return res.status(503).json({ 
      message: 'Tempo limite excedido ao listar bancos',
      timeout: true
    });
  }, 15000); // Aumentado para 15 segundos de timeout

  try {
    // Verificar se temos um cache válido
    const now = Date.now();
    if (banksCache.data && now - banksCache.timestamp < 3600000) { // Cache válido por 1 hora
      clearTimeout(timeout);
      console.log('Retornando dados de bancos do cache');
      return res.json(banksCache.data);
    }

    // Se já está carregando, aguardar
    if (banksCache.isLoading) {
      // Se estiver carregando, retornar o que temos no cache, mesmo que esteja expirado
      // Isso evita sobrecarga no banco de dados
      if (banksCache.data) {
        clearTimeout(timeout);
        console.log('Carregamento em andamento, retornando cache existente (mesmo que expirado)');
        return res.json(banksCache.data);
      }
      
      clearTimeout(timeout);
      console.log('Carregamento de bancos em andamento, retornando resposta temporária');
      return res.status(202).json({ 
        message: 'Dados sendo carregados, tente novamente em alguns segundos',
        loading: true
      });
    }

    // Marcar que estamos carregando
    banksCache.isLoading = true;
    
    console.log('Listando todos os bancos (rota pública) - buscando do banco de dados');

    try {
      // Usar query SQL direta com timeout
      const result = await sequelize.query(`
        SELECT id, name, code 
        FROM banks 
        ORDER BY name ASC
        LIMIT 500
      `, standardQueryOptions);

      // Garantir que result é um array
      if (!Array.isArray(result)) {
        console.error('Erro: Resultado da query não é um array');
        throw new Error('Resultado da query não é um array');
      }

      // Verificar se o array está vazio
      if (result.length === 0) {
        console.warn('Atenção: A consulta retornou um array vazio, usando lista de bancos padrão');
        banksCache.data = defaultBanks;
        banksCache.timestamp = now;
        banksCache.isLoading = false;
        clearTimeout(timeout);
        return res.json(defaultBanks);
      }

      // Formatar os bancos (sem descriptografia para melhorar performance)
      const formattedBanks = result.map(bank => ({
        id: bank.id,
        name: bank.name,
        code: bank.code
      }));

      // Atualizar o cache
      banksCache.data = formattedBanks;
      banksCache.timestamp = now;
      banksCache.isLoading = false;
      
      // Cancelar o timeout pois a requisição foi bem-sucedida
      clearTimeout(timeout);
      
      return res.json(formattedBanks);
    } catch (dbError) {
      console.error('Erro ao consultar bancos no banco de dados:', dbError);
      
      // Se temos dados em cache, mesmo que expirados, usar para emergência
      if (banksCache.data) {
        console.log('Usando cache expirado devido a erro no banco de dados');
        banksCache.isLoading = false;
        clearTimeout(timeout);
        return res.json(banksCache.data);
      }
      
      // Se não temos cache, usar a lista de bancos padrão como último recurso
      console.log('Usando lista de bancos padrão como fallback');
      banksCache.data = defaultBanks;
      banksCache.timestamp = now;
      banksCache.isLoading = false;
      clearTimeout(timeout);
      return res.json(defaultBanks);
    }
  } catch (error) {
    // Restaurar o estado do cache em caso de erro
    banksCache.isLoading = false;
    
    // Cancelar o timeout manualmente
    clearTimeout(timeout);
    
    console.error('Erro ao listar bancos:', error);
    return res.status(500).json({ 
      message: 'Erro ao listar bancos', 
      error: error.message 
    });
  }
});

// Rota protegida - Requer autenticação - Bancos favoritos do usuário
router.get('/favorites', authenticate, checkSubscription, async (req, res) => {
  // Adicionar timeout para evitar que a requisição fique pendente por muito tempo
  const timeout = setTimeout(() => {
    console.error(`Timeout ao buscar bancos favoritos para o usuário ${req.user.id}`);
    return res.status(503).json({ 
      message: 'Tempo limite excedido ao buscar bancos favoritos',
      timeout: true
    });
  }, 10000); // 10 segundos de timeout

  try {
    const userId = req.user.id;
    const cacheKey = `${userId}-${req.query.onlyActive === 'true' ? 'active' : 'all'}`;
    
    // Verificar se temos um cache válido para este usuário
    const cachedData = favoritesBanksCache.get(cacheKey);
    const now = Date.now();
    if (cachedData && now - cachedData.timestamp < 300000) { // Cache válido por 5 minutos
      clearTimeout(timeout);
      console.log(`Retornando dados de bancos favoritos do cache para usuário ${userId}`);
      return res.json(cachedData.data);
    }
    
    console.log(`Buscando bancos favoritos para o usuário ${userId}`);
    
    // Usar query SQL direta para melhor performance
    const result = await sequelize.query(`
      SELECT ub.bank_id, ub.is_active, b.name, b.code
      FROM user_banks AS ub
      JOIN banks AS b ON ub.bank_id = b.id
      WHERE ub.user_id = :userId AND ub.is_active = 1
    `, {
      ...standardQueryOptions,
      replacements: { userId }
    });

    // Garantir que result é um array
    if (!Array.isArray(result)) {
      console.error(`Erro: Resultado da query não é um array para usuário ${userId}`);
      throw new Error('Resultado da query não é um array');
    }

    // Formatar os bancos com suas informações e status
    const banksWithStatus = result.map(userBank => ({
      id: userBank.bank_id,
      name: userBank.name,
      code: userBank.code,
      is_active: Boolean(userBank.is_active)
    }));

    // Ordenar por nome
    banksWithStatus.sort((a, b) => a.name.localeCompare(b.name));

    // Se apenas os ativos foram solicitados, filtrar
    let resultBanks = banksWithStatus;
    if (req.query.onlyActive === 'true') {
      resultBanks = banksWithStatus.filter(bank => bank.is_active);
      console.log(`Filtrando apenas bancos ativos: ${resultBanks.length} encontrados`);
    }

    // Armazenar no cache
    favoritesBanksCache.set(cacheKey, {
      data: resultBanks,
      timestamp: now
    });
    
    // Cancelar timeout pois requisição foi bem-sucedida
    clearTimeout(timeout);

    console.log(`Retornando ${resultBanks.length} bancos favoritos para o usuário ${userId}`);
    res.json(resultBanks);
  } catch (error) {
    // Cancelar timeout em caso de erro
    clearTimeout(timeout);
    
    console.error('Erro ao listar bancos favoritos:', error);
    res.status(500).json({ 
      message: 'Erro ao listar bancos favoritos',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

// Rota protegida - Requer autenticação - Bancos ativos do usuário
router.get('/users', authenticate, checkSubscription, async (req, res) => {
  // Adicionar timeout para evitar que a requisição fique pendente por muito tempo
  const timeout = setTimeout(() => {
    console.error(`Timeout ao buscar bancos ativos para o usuário ${req.user.id}`);
    return res.status(503).json({ 
      message: 'Tempo limite excedido ao buscar bancos ativos',
      timeout: true
    });
  }, 8000); // 8 segundos de timeout

  try {
    const userId = req.user.id;
    
    // Verificar se temos um cache válido para este usuário
    const cachedData = usersBanksCache.get(userId);
    const now = Date.now();
    if (cachedData && now - cachedData.timestamp < 300000) { // Cache válido por 5 minutos
      clearTimeout(timeout);
      console.log(`Retornando dados de bancos ativos do cache para usuário ${userId}`);
      return res.json(cachedData.data);
    }
    
    console.log(`Buscando bancos ativos para o usuário ${userId}`);
    
    // Usar query SQL direta para melhor performance
    const result = await sequelize.query(`
      SELECT b.id, b.name, b.code
      FROM user_banks AS ub
      JOIN banks AS b ON ub.bank_id = b.id
      WHERE ub.user_id = :userId AND ub.is_active = 1
    `, {
      ...standardQueryOptions,
      replacements: { userId }
    });

    // Garantir que result é um array
    if (!Array.isArray(result)) {
      console.error(`Erro: Resultado da query não é um array para usuário ${userId}`);
      throw new Error('Resultado da query não é um array');
    }

    // Formatar os bancos
    const activeBanks = result.map(bank => ({
      id: bank.id,
      name: bank.name,
      code: bank.code
    }));

    // Armazenar no cache
    usersBanksCache.set(userId, {
      data: activeBanks,
      timestamp: now
    });
    
    // Cancelar timeout pois requisição foi bem-sucedida
    clearTimeout(timeout);

    console.log(`Retornando ${activeBanks.length} bancos ativos para o usuário ${userId}`);
    res.json(activeBanks);
  } catch (error) {
    // Cancelar timeout em caso de erro
    clearTimeout(timeout);
    
    console.error('Erro ao listar bancos do usuário:', error);
    res.status(500).json({ 
      message: 'Erro ao listar bancos do usuário',
      error: process.env.NODE_ENV === 'production' ? null : error.message
    });
  }
});

// // Listar bancos do usuário
// router.get('/my-banks', authenticate, async (req, res) => {
//   try {
//     const userBanks = await UserBank.findAll({
//       where: { user_id: req.user.id },
//       include: [{ model: Bank }],
//       order: [[Bank, 'name', 'ASC']]
//     });
//     res.json(userBanks);
//   } catch (error) {
//     console.error('Erro ao listar bancos do usuário:', error);
//     res.status(500).json({ message: 'Erro ao listar bancos do usuário' });
//   }
// });

// // Adicionar banco ao usuário
// router.post('/add', authentica te, async (req, res) => {
//   try {
//     const { bank_id } = req.body;
    
//     // Verifica se o banco já está vinculado
//     const existingBank = await UserBank.findOne({
//       where: {
//         user_id: req.user.id,
//         bank_id
//       }
//     });

//     if (existingBank) {
//       if (!existingBank.is_active) {
//         await existingBank.update({ is_active: true });
//         return res.json({ message: 'Banco reativado com sucesso' });
//       }
//       return res.status(400).json({ message: 'Banco já vinculado' });
//     }

//     await UserBank.create({
//       user_id: req.user.id,
//       bank_id
//     });

//     res.json({ message: 'Banco adicionado com sucesso' });
//   } catch (error) {
//     console.error('Erro ao adicionar banco:', error);
//     res.status(500).json({ message: 'Erro ao adicionar banco' });
//   }
// });

// // Remover banco do usuário
// router.delete('/:id', authenticate, async (req, res) => {
//   try {
//     const userBank = await UserBank.findOne({
//       where: {
//         user_id: req.user.id,
//         bank_id: req.params.id
//       }
//     });

//     if (!userBank) {
//       return res.status(404).json({ message: 'Banco não encontrado' });
//     }

//     await userBank.update({ is_active: false });
//     res.json({ message: 'Banco removido com sucesso' });
//   } catch (error) {
//     console.error('Erro ao remover banco:', error);
//     res.status(500).json({ message: 'Erro ao remover banco' });
//   }
// });

// Rota protegida - Requer autenticação - Gerenciar bancos favoritos (POST)
router.post('/favorites', authenticate, checkSubscription, async (req, res) => {
  const { bank_id, is_active } = req.body;
  const user_id = req.user.id;

  if (!bank_id) {
    return res.status(400).json({ message: 'ID do banco é obrigatório' });
  }

  try {
    console.log('Atualizando banco favorito:', { bank_id, is_active, user_id });

    const bank = await Bank.findByPk(bank_id);
    if (!bank) {
      return res.status(404).json({ message: 'Banco não encontrado' });
    }

    // Primeiro verifica se já existe essa relação
    let userBank = await UserBank.findOne({
      where: { user_id, bank_id }
    });

    if (userBank) {
      // Se já existe, apenas atualiza
      await userBank.update({ is_active });
      console.log(`Relação UserBank atualizada: ${userBank.id}, is_active=${is_active}`);
    } else {
      // Se não existe, cria uma nova
      userBank = await UserBank.create({
        user_id,
        bank_id,
        is_active
      });
      console.log(`Nova relação UserBank criada: ${userBank.id}, is_active=${is_active}`);
    }

    // Busca os dados atualizados para retornar
    const updatedUserBank = await UserBank.findOne({
      where: { user_id, bank_id },
      include: [{
        model: Bank,
        as: 'bank',
        attributes: ['id', 'name', 'code']
      }]
    });

    res.json({
      message: 'Banco favorito atualizado com sucesso',
      bank: updatedUserBank.bank,
      is_active: updatedUserBank.is_active
    });
  } catch (error) {
    console.error('Erro ao atualizar banco favorito:', error);
    res.status(500).json({ message: 'Erro ao atualizar banco favorito' });
  }
});

// Rota protegida - Requer autenticação - Atualizar bancos favoritos (PUT)
router.put('/favorites', authenticate, checkSubscription, async (req, res) => {
  const { bank_id, is_active } = req.body;
  const user_id = req.user.id;

  if (!bank_id) {
    return res.status(400).json({ message: 'ID do banco é obrigatório' });
  }

  try {
    console.log('Atualizando banco favorito (PUT):', { bank_id, is_active, user_id });

    const bank = await Bank.findByPk(bank_id);
    if (!bank) {
      return res.status(404).json({ message: 'Banco não encontrado' });
    }

    // Primeiro verifica se já existe essa relação
    let userBank = await UserBank.findOne({
      where: { user_id, bank_id }
    });

    if (userBank) {
      // Se já existe, apenas atualiza
      await userBank.update({ is_active });
      console.log(`Relação UserBank atualizada: ${userBank.id}, is_active=${is_active}`);
    } else {
      // Se não existe, cria uma nova
      userBank = await UserBank.create({
        user_id,
        bank_id,
        is_active
      });
      console.log(`Nova relação UserBank criada: ${userBank.id}, is_active=${is_active}`);
    }

    // Busca os dados atualizados para retornar
    const updatedUserBank = await UserBank.findOne({
      where: { user_id, bank_id },
      include: [{
        model: Bank,
        as: 'bank',
        attributes: ['id', 'name', 'code']
      }]
    });

    res.json({
      message: 'Banco favorito atualizado com sucesso',
      bank: updatedUserBank.bank,
      is_active: updatedUserBank.is_active
    });
  } catch (error) {
    console.error('Erro ao atualizar banco favorito:', error);
    res.status(500).json({ message: 'Erro ao atualizar banco favorito' });
  }
});

export default router;

// Pré-carregar o cache de bancos ao iniciar o servidor
(async () => {
  try {
    console.log('Pré-carregando cache de bancos...');
    
    // Adicionar um contador de tentativas
    let attempts = 0;
    const maxAttempts = 5;
    let success = false;
    
    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        // Usar query SQL direta com timeout
        const result = await sequelize.query(`
          SELECT id, name, code 
          FROM banks 
          ORDER BY name ASC
          LIMIT 500
        `, standardQueryOptions);

        // Garantir que result é um array
        if (!Array.isArray(result)) {
          console.error(`❌ Resultado da query não é um array na tentativa #${attempts}`);
          throw new Error('Resultado da query não é um array');
        }

        // Verificar se o array está vazio
        if (result.length === 0) {
          console.warn(`❌ A consulta retornou um array vazio na tentativa #${attempts}, usando lista de bancos padrão`);
          banksCache.data = defaultBanks;
          banksCache.timestamp = Date.now();
          banksCache.isLoading = false;
          success = true;
          console.log(`✅ Cache de bancos pré-carregado com lista padrão: ${defaultBanks.length} bancos`);
          return;
        }

        const formattedBanks = result.map(bank => ({
          id: bank.id,
          name: bank.name,
          code: bank.code
        }));

        banksCache.data = formattedBanks;
        banksCache.timestamp = Date.now();
        console.log(`✅ Cache de bancos pré-carregado com sucesso na tentativa #${attempts} com ${formattedBanks.length} bancos`);
        success = true;
      } catch (error) {
        console.error(`❌ Erro ao pré-carregar cache de bancos na tentativa #${attempts}:`, error);
        
        // Aguardar antes da próxima tentativa (tempo exponencial)
        if (attempts < maxAttempts) {
          const waitTime = Math.pow(2, attempts) * 1000; // 2s, 4s, 8s, 16s
          console.log(`Aguardando ${waitTime/1000}s antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!success) {
      console.error(`❌ Não foi possível pré-carregar o cache de bancos após ${maxAttempts} tentativas`);
      console.log('Usando lista de bancos padrão como fallback');
      
      // Usar a lista de bancos padrão como fallback
      banksCache.data = defaultBanks;
      banksCache.timestamp = Date.now();
      banksCache.isLoading = false;
      console.log(`✅ Cache de bancos pré-carregado com lista padrão: ${defaultBanks.length} bancos`);
    }
  } catch (error) {
    console.error('❌ Erro fatal ao pré-carregar cache de bancos:', error);
    // Mesmo em caso de erro fatal, usar lista de fallback
    console.log('Usando lista de bancos padrão como fallback após erro fatal');
    banksCache.data = defaultBanks;
    banksCache.timestamp = Date.now();
  } finally {
    // Garantir que a flag de carregamento seja desligada em qualquer caso
    banksCache.isLoading = false;
  }
})();
